package ai.pixelforge.virtualcreatures;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String PREFS_NAME = "CapWebViewSettings";
    private static final String KEY_SERVER_BASE_PATH = "serverBasePath";

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager pm = context.getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(context.getPackageName(), 0);

            String versionName = pInfo.versionName != null ? pInfo.versionName : "1.0.0";
            long versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = pInfo.getLongVersionCode();
            } else {
                versionCode = pInfo.versionCode;
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String currentServerBasePath = prefs.getString(KEY_SERVER_BASE_PATH, null);

            JSObject ret = new JSObject();
            ret.put("versionName", versionName);
            ret.put("versionCode", versionCode);
            ret.put("packageName", context.getPackageName());
            ret.put("currentServerBasePath", currentServerBasePath);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Falha ao obter informações do aplicativo: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadAndExtractWebBundle(PluginCall call) {
        String bundleUrl = call.getString("bundleUrl");
        String expectedChecksum = call.getString("checksum");
        String version = call.getString("version", "latest");

        if (bundleUrl == null || expectedChecksum == null) {
            call.reject("bundleUrl e checksum são obrigatórios");
            return;
        }

        new Thread(() -> {
            File tempZip = null;
            try {
                Context context = getContext();
                File cacheDir = context.getCacheDir();
                tempZip = new File(cacheDir, "update_bundle_" + System.currentTimeMillis() + ".zip");

                downloadFile(bundleUrl, tempZip);

                String actualChecksum = calculateSha256(tempZip);
                if (!actualChecksum.equalsIgnoreCase(expectedChecksum.trim())) {
                    if (tempZip.exists()) tempZip.delete();
                    call.reject("Integridade corrompida: checksum SHA-256 divergente.");
                    return;
                }

                File updatesDir = new File(context.getFilesDir(), "updates");
                File versionDir = new File(updatesDir, sanitizeDirName(version));
                if (versionDir.exists()) {
                    deleteRecursively(versionDir);
                }
                versionDir.mkdirs();

                unzip(tempZip, versionDir);
                if (tempZip.exists()) tempZip.delete();

                // Persist new serverBasePath in Capacitor preferences
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString(KEY_SERVER_BASE_PATH, versionDir.getAbsolutePath()).apply();

                if (getActivity() != null) {
                    final String path = versionDir.getAbsolutePath();
                    getActivity().runOnUiThread(() -> {
                        if (getBridge() != null) {
                            getBridge().setServerBasePath(path);
                        }
                    });
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("path", versionDir.getAbsolutePath());
                call.resolve(ret);
            } catch (Exception e) {
                if (tempZip != null && tempZip.exists()) {
                    tempZip.delete();
                }
                call.reject("Falha ao processar atualização web: " + e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String apkUrl = call.getString("apkUrl");
        String expectedChecksum = call.getString("checksum");
        String version = call.getString("version", "latest");

        if (apkUrl == null || expectedChecksum == null) {
            call.reject("apkUrl e checksum são obrigatórios");
            return;
        }

        new Thread(() -> {
            File apkFile = null;
            try {
                Context context = getContext();
                File targetDir = context.getExternalCacheDir() != null ? context.getExternalCacheDir() : context.getCacheDir();
                apkFile = new File(targetDir, "pixelforge-update-" + sanitizeDirName(version) + ".apk");

                downloadFile(apkUrl, apkFile);

                String actualChecksum = calculateSha256(apkFile);
                if (!actualChecksum.equalsIgnoreCase(expectedChecksum.trim())) {
                    if (apkFile.exists()) apkFile.delete();
                    call.reject("Integridade do APK corrompida: checksum divergente.");
                    return;
                }

                Uri apkUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        apkFile
                );

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                context.startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("path", apkFile.getAbsolutePath());
                call.resolve(ret);
            } catch (Exception e) {
                if (apkFile != null && apkFile.exists()) {
                    apkFile.delete();
                }
                call.reject("Falha ao baixar/instalar APK: " + e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void resetToBundledVersion(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(KEY_SERVER_BASE_PATH).apply();

            if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    if (getBridge() != null) {
                        getBridge().setServerBasePath(null);
                    }
                });
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Falha ao redefinir versão: " + e.getMessage(), e);
        }
    }

    private void downloadFile(String fileUrl, File destination) throws Exception {
        URL url = new URL(fileUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestProperty("User-Agent", "PixelForge-AI-Updater");
        conn.connect();

        int responseCode = conn.getResponseCode();
        if (responseCode < 200 || responseCode >= 300) {
            throw new Exception("Falha HTTP " + responseCode + " ao baixar arquivo");
        }

        try (InputStream in = new BufferedInputStream(conn.getInputStream());
             FileOutputStream out = new FileOutputStream(destination)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        } finally {
            conn.disconnect();
        }
    }

    private String calculateSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        byte[] hash = digest.digest();
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private void unzip(File zipFile, File targetDirectory) throws Exception {
        String canonicalDest = targetDirectory.getCanonicalPath();

        try (ZipInputStream zis = new ZipInputStream(new BufferedInputStream(new FileInputStream(zipFile)))) {
            ZipEntry entry;
            byte[] buffer = new byte[8192];

            while ((entry = zis.getNextEntry()) != null) {
                File file = new File(targetDirectory, entry.getName());
                String canonicalPath = file.getCanonicalPath();

                // Prevent Zip Slip vulnerability
                if (!canonicalPath.startsWith(canonicalDest + File.separator) && !canonicalPath.equals(canonicalDest)) {
                    throw new SecurityException("Zip entry ilegal: tentativa de escape fora do diretório de destino");
                }

                if (entry.isDirectory()) {
                    file.mkdirs();
                } else {
                    File parent = file.getParentFile();
                    if (parent != null && !parent.exists()) {
                        parent.mkdirs();
                    }
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        int count;
                        while ((count = zis.read(buffer)) != -1) {
                            fos.write(buffer, 0, count);
                        }
                    }
                }
                zis.closeEntry();
            }
        }
    }

    private void deleteRecursively(File fileOrDir) {
        if (fileOrDir.isDirectory()) {
            File[] children = fileOrDir.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        fileOrDir.delete();
    }

    private String sanitizeDirName(String raw) {
        return raw.replaceAll("[^a-zA-Z0-9.-]", "_");
    }
}
