package ai.pixelforge.virtualcreatures;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "NearbyConnections",
    permissions = {
        @Permission(
            alias = "nearby_bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT
            }
        ),
        @Permission(
            alias = "nearby_wifi",
            strings = {
                Manifest.permission.NEARBY_WIFI_DEVICES
            }
        ),
        @Permission(
            alias = "nearby_location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class NearbyConnectionsPlugin extends Plugin {

    private static final String TAG = "NearbyConnections";
    private static final String DEFAULT_SERVICE_ID = "ai.pixelforge.virtualcreatures.breeding";
    private static final Strategy STRATEGY = Strategy.P2P_POINT_TO_POINT;
    private static final long POST_GRANT_RETRY_WINDOW_MS = 5000L;
    private static final long POST_GRANT_RETRY_DELAY_MS = 350L;
    private static final int MAX_POST_GRANT_ATTEMPTS = 2;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private ConnectionsClient connectionsClient;
    private boolean clientInitializedWithPermissions = false;
    private long lastPermissionGrantElapsedMs = 0L;
    private boolean isAdvertising = false;
    private boolean isDiscovering = false;

    @Override
    public void load() {
        super.load();
        clientInitializedWithPermissions = areRequiredPermissionsGranted();
        connectionsClient = Nearby.getConnectionsClient(resolvePluginContext());
        Log.d(TAG, "Plugin NearbyConnections inicializado (permissões=" + clientInitializedWithPermissions + ").");
    }

    private Context resolvePluginContext() {
        Activity activity = getActivity();
        return activity != null ? activity : getContext();
    }

    private synchronized ConnectionsClient refreshConnectionsClient() {
        connectionsClient = Nearby.getConnectionsClient(resolvePluginContext());
        clientInitializedWithPermissions = areRequiredPermissionsGranted();
        isAdvertising = false;
        isDiscovering = false;
        Log.d(TAG, "ConnectionsClient reinicializado (permissões=" + clientInitializedWithPermissions + ").");
        return connectionsClient;
    }

    private synchronized ConnectionsClient getOrRefreshConnectionsClient() {
        boolean hasPerms = areRequiredPermissionsGranted();
        if (connectionsClient == null || (!clientInitializedWithPermissions && hasPerms)) {
            if (!clientInitializedWithPermissions && hasPerms && lastPermissionGrantElapsedMs == 0L) {
                lastPermissionGrantElapsedMs = SystemClock.elapsedRealtime();
            }
            return refreshConnectionsClient();
        }
        return connectionsClient;
    }

    private final ConnectionLifecycleCallback connectionLifecycleCallback = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(@NonNull String endpointId, @NonNull ConnectionInfo connectionInfo) {
            Log.d(TAG, "onConnectionInitiated: id=" + endpointId + " incoming=" + connectionInfo.isIncomingConnection());
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("endpointName", connectionInfo.getEndpointName());
            data.put("authenticationDigits", connectionInfo.getAuthenticationDigits());
            data.put("isIncoming", connectionInfo.isIncomingConnection());
            notifyListeners("onConnectionInitiated", data);
        }

        @Override
        public void onConnectionResult(@NonNull String endpointId, @NonNull ConnectionResolution resolution) {
            int statusCode = resolution.getStatus().getStatusCode();
            String statusCodeName = ConnectionsStatusCodes.getStatusCodeString(statusCode);
            boolean success = statusCode == ConnectionsStatusCodes.STATUS_OK;

            Log.d(TAG, "onConnectionResult: id=" + endpointId + " status=" + statusCode + " (" + statusCodeName + ") success=" + success);

            if (success) {
                ConnectionsClient client = getOrRefreshConnectionsClient();
                if (isAdvertising) {
                    client.stopAdvertising();
                    isAdvertising = false;
                }
                if (isDiscovering) {
                    client.stopDiscovery();
                    isDiscovering = false;
                }
            }

            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("statusCode", statusCode);
            data.put("statusCodeName", statusCodeName);
            data.put("success", success);
            data.put("statusMessage", resolution.getStatus().getStatusMessage());
            notifyListeners("onConnectionResult", data);
        }

        @Override
        public void onDisconnected(@NonNull String endpointId) {
            Log.d(TAG, "onDisconnected: id=" + endpointId);
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            notifyListeners("onDisconnected", data);
        }
    };

    private final EndpointDiscoveryCallback endpointDiscoveryCallback = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(@NonNull String endpointId, @NonNull DiscoveredEndpointInfo info) {
            Log.d(TAG, "onEndpointFound: id=" + endpointId + " name=" + info.getEndpointName());
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("endpointName", info.getEndpointName());
            data.put("serviceId", info.getServiceId());
            notifyListeners("onEndpointFound", data);
        }

        @Override
        public void onEndpointLost(@NonNull String endpointId) {
            Log.d(TAG, "onEndpointLost: id=" + endpointId);
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            notifyListeners("onEndpointLost", data);
        }
    };

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(@NonNull String endpointId, @NonNull Payload payload) {
            if (payload.getType() == Payload.Type.BYTES) {
                byte[] bytes = payload.asBytes();
                String message = bytes != null ? new String(bytes, StandardCharsets.UTF_8) : "";
                Log.d(TAG, "onPayloadReceived: from=" + endpointId + " bytes=" + (bytes != null ? bytes.length : 0));
                JSObject data = new JSObject();
                data.put("endpointId", endpointId);
                data.put("payload", message);
                data.put("payloadId", payload.getId());
                notifyListeners("onPayloadReceived", data);
            }
        }

        @Override
        public void onPayloadTransferUpdate(@NonNull String endpointId, @NonNull PayloadTransferUpdate update) {
            JSObject data = new JSObject();
            data.put("endpointId", endpointId);
            data.put("payloadId", update.getPayloadId());
            data.put("status", update.getStatus());
            data.put("bytesTransferred", update.getBytesTransferred());
            data.put("totalBytes", update.getTotalBytes());
            notifyListeners("onPayloadTransferUpdate", data);
        }
    };

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            int status = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(getContext());
            boolean available = status == ConnectionResult.SUCCESS;
            JSObject ret = new JSObject();
            ret.put("available", available);
            ret.put("statusCode", status);
            if (!available) {
                ret.put("reason", GoogleApiAvailability.getInstance().getErrorString(status));
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao verificar disponibilidade do Google Play Services: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        List<String> missingPermissions = getMissingPermissions();

        JSObject ret = new JSObject();
        ret.put("granted", missingPermissions.isEmpty());
        ret.put("missingCount", missingPermissions.size());
        if (!missingPermissions.isEmpty()) {
            ret.put("missingDetails", String.join(", ", missingPermissions));
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (areRequiredPermissionsGranted()) {
            getOrRefreshConnectionsClient();
            checkPermissions(call);
            return;
        }

        // Em Android 13+ (TIRAMISU), ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION usam maxSdkVersion="32"
        // no AndroidManifest.xml; pedir "nearby_location" faria Bridge.validatePermissions() rejeitar a chamada.
        String[] aliasesToRequest = getMissingAliasesForCurrentSdk();
        if (aliasesToRequest.length == 0) {
            checkPermissions(call);
            return;
        }

        requestPermissionForAliases(aliasesToRequest, call, "nearbyPermissionsCallback");
    }

    @PermissionCallback
    private void nearbyPermissionsCallback(PluginCall call) {
        if (areRequiredPermissionsGranted()) {
            lastPermissionGrantElapsedMs = SystemClock.elapsedRealtime();
            refreshConnectionsClient();
        }
        checkPermissions(call);
    }

    private List<String> getMissingPermissions() {
        Context context = resolvePluginContext();
        List<String> requiredPermissions = getRequiredPermissionsForCurrentSdk();
        List<String> missingPermissions = new ArrayList<>();

        for (String permission : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
                missingPermissions.add(permission);
            }
        }
        return missingPermissions;
    }

    private boolean areRequiredPermissionsGranted() {
        return getMissingPermissions().isEmpty();
    }

    private String[] getMissingAliasesForCurrentSdk() {
        Context context = resolvePluginContext();
        List<String> aliases = new ArrayList<>();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            boolean needsBluetooth =
                ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_ADVERTISE) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED;
            if (needsBluetooth) {
                aliases.add("nearby_bluetooth");
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.NEARBY_WIFI_DEVICES) != PackageManager.PERMISSION_GRANTED) {
                aliases.add("nearby_wifi");
            }
        } else if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            aliases.add("nearby_location");
        }

        return aliases.toArray(new String[0]);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (!clientInitializedWithPermissions && areRequiredPermissionsGranted()) {
            lastPermissionGrantElapsedMs = SystemClock.elapsedRealtime();
            refreshConnectionsClient();
        }
    }

    private boolean isWithinPostPermissionGrantWindow() {
        return lastPermissionGrantElapsedMs > 0L
                && (SystemClock.elapsedRealtime() - lastPermissionGrantElapsedMs) <= POST_GRANT_RETRY_WINDOW_MS;
    }

    private boolean isHardwareDisabled() {
        try {
            BluetoothAdapter btAdapter = BluetoothAdapter.getDefaultAdapter();
            if (btAdapter == null || !btAdapter.isEnabled()) {
                return true;
            }
        } catch (Exception ignored) {}

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            try {
                LocationManager locManager = (LocationManager) resolvePluginContext().getSystemService(Context.LOCATION_SERVICE);
                if (locManager != null) {
                    boolean isGpsEnabled = locManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
                    boolean isNetworkEnabled = locManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                    if (!isGpsEnabled && !isNetworkEnabled) {
                        return true;
                    }
                }
            } catch (Exception ignored) {}
        }

        return false;
    }

    private boolean shouldRetryRadioStartup(int attempt, Exception error) {
        if (attempt >= MAX_POST_GRANT_ATTEMPTS || !areRequiredPermissionsGranted() || isHardwareDisabled()) {
            return false;
        }
        return error instanceof SecurityException || isWithinPostPermissionGrantWindow();
    }

    private String getHardwareDiagnostics() {
        StringBuilder sb = new StringBuilder();
        try {
            BluetoothAdapter btAdapter = BluetoothAdapter.getDefaultAdapter();
            if (btAdapter == null) {
                sb.append(" [Dispositivo sem suporte a Bluetooth]");
            } else if (!btAdapter.isEnabled()) {
                sb.append(" [Bluetooth está DESLIGADO no aparelho - ative para parear]");
            }
        } catch (Exception ignored) {}

        try {
            LocationManager locManager = (LocationManager) resolvePluginContext().getSystemService(Context.LOCATION_SERVICE);
            if (locManager != null) {
                boolean isGpsEnabled = locManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
                boolean isNetworkEnabled = locManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
                if (!isGpsEnabled && !isNetworkEnabled) {
                    sb.append(" [Localização/GPS está DESLIGADA no aparelho - ative para parear]");
                }
            }
        } catch (Exception ignored) {}

        return sb.toString();
    }

    private boolean isAlreadyConnectedStatus(Exception e) {
        if (e instanceof ApiException) {
            int code = ((ApiException) e).getStatusCode();
            return code == ConnectionsStatusCodes.STATUS_ALREADY_CONNECTED_TO_ENDPOINT;
        }
        String msg = e.getMessage();
        return msg != null && (msg.contains("8003") || msg.contains("STATUS_ALREADY_CONNECTED_TO_ENDPOINT"));
    }

    private void resolveSuccess(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private boolean isAlreadyActiveCode(Exception e, int expectedStatusCode) {
        return e instanceof ApiException && ((ApiException) e).getStatusCode() == expectedStatusCode;
    }

    private void handleRadioStartupFailure(
            PluginCall call,
            Exception e,
            int attempt,
            String operationName,
            Runnable onFinalFailure,
            Runnable onRetry
    ) {
        if (shouldRetryRadioStartup(attempt, e)) {
            Log.w(TAG, "Retentando " + operationName + " após concessão de permissões (tentativa=" + (attempt + 1) + "): " + e.getMessage());
            mainHandler.postDelayed(onRetry, POST_GRANT_RETRY_DELAY_MS);
            return;
        }
        onFinalFailure.run();
        call.reject("Falha ao iniciar " + operationName + " Nearby: " + e.getMessage() + getHardwareDiagnostics(), e);
    }

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        String endpointName = call.getString("endpointName", "PixelForge-Player");
        String serviceId = call.getString("serviceId", DEFAULT_SERVICE_ID);
        attemptStartAdvertising(call, endpointName, serviceId, 0);
    }

    private void attemptStartAdvertising(PluginCall call, String endpointName, String serviceId, int attempt) {
        AdvertisingOptions options = new AdvertisingOptions.Builder()
                .setStrategy(STRATEGY)
                .build();

        ConnectionsClient client = attempt > 0 ? refreshConnectionsClient() : getOrRefreshConnectionsClient();
        try {
            client.startAdvertising(endpointName, serviceId, connectionLifecycleCallback, options)
                    .addOnSuccessListener(unused -> {
                        isAdvertising = true;
                        resolveSuccess(call);
                    })
                    .addOnFailureListener(e -> {
                        if (isAlreadyActiveCode(e, ConnectionsStatusCodes.STATUS_ALREADY_ADVERTISING)) {
                            isAdvertising = true;
                            resolveSuccess(call);
                            return;
                        }
                        handleRadioStartupFailure(
                                call,
                                e,
                                attempt,
                                "anúncio",
                                () -> isAdvertising = false,
                                () -> attemptStartAdvertising(call, endpointName, serviceId, attempt + 1)
                        );
                    });
        } catch (SecurityException se) {
            handleRadioStartupFailure(
                    call,
                    se,
                    attempt,
                    "anúncio",
                    () -> isAdvertising = false,
                    () -> attemptStartAdvertising(call, endpointName, serviceId, attempt + 1)
            );
        }
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        try {
            getOrRefreshConnectionsClient().stopAdvertising();
            isAdvertising = false;
            resolveSuccess(call);
        } catch (Exception e) {
            call.reject("Erro ao parar anúncio: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        String serviceId = call.getString("serviceId", DEFAULT_SERVICE_ID);
        attemptStartDiscovery(call, serviceId, 0);
    }

    private void attemptStartDiscovery(PluginCall call, String serviceId, int attempt) {
        DiscoveryOptions options = new DiscoveryOptions.Builder()
                .setStrategy(STRATEGY)
                .build();

        ConnectionsClient client = attempt > 0 ? refreshConnectionsClient() : getOrRefreshConnectionsClient();
        try {
            client.startDiscovery(serviceId, endpointDiscoveryCallback, options)
                    .addOnSuccessListener(unused -> {
                        isDiscovering = true;
                        resolveSuccess(call);
                    })
                    .addOnFailureListener(e -> {
                        if (isAlreadyActiveCode(e, ConnectionsStatusCodes.STATUS_ALREADY_DISCOVERING)) {
                            isDiscovering = true;
                            resolveSuccess(call);
                            return;
                        }
                        handleRadioStartupFailure(
                                call,
                                e,
                                attempt,
                                "descoberta",
                                () -> isDiscovering = false,
                                () -> attemptStartDiscovery(call, serviceId, attempt + 1)
                        );
                    });
        } catch (SecurityException se) {
            handleRadioStartupFailure(
                    call,
                    se,
                    attempt,
                    "descoberta",
                    () -> isDiscovering = false,
                    () -> attemptStartDiscovery(call, serviceId, attempt + 1)
            );
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        try {
            getOrRefreshConnectionsClient().stopDiscovery();
            isDiscovering = false;
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao parar descoberta: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void requestConnection(PluginCall call) {
        String endpointId = call.getString("endpointId");
        String endpointName = call.getString("endpointName", "PixelForge-Player");

        if (endpointId == null || endpointId.isEmpty()) {
            call.reject("endpointId é obrigatório");
            return;
        }

        getOrRefreshConnectionsClient().requestConnection(endpointName, endpointId, connectionLifecycleCallback)
                .addOnSuccessListener(unused -> {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    if (isAlreadyConnectedStatus(e)) {
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("alreadyConnected", true);
                        call.resolve(ret);
                        return;
                    }
                    call.reject("Falha ao solicitar conexão Nearby: " + e.getMessage(), e);
                });
    }

    @PluginMethod
    public void acceptConnection(PluginCall call) {
        String endpointId = call.getString("endpointId");

        if (endpointId == null || endpointId.isEmpty()) {
            call.reject("endpointId é obrigatório");
            return;
        }

        getOrRefreshConnectionsClient().acceptConnection(endpointId, payloadCallback)
                .addOnSuccessListener(unused -> {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    if (isAlreadyConnectedStatus(e)) {
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("alreadyConnected", true);
                        call.resolve(ret);
                        return;
                    }
                    call.reject("Falha ao aceitar conexão Nearby: " + e.getMessage(), e);
                });
    }

    @PluginMethod
    public void rejectConnection(PluginCall call) {
        String endpointId = call.getString("endpointId");

        if (endpointId == null || endpointId.isEmpty()) {
            call.reject("endpointId é obrigatório");
            return;
        }

        getOrRefreshConnectionsClient().rejectConnection(endpointId)
                .addOnSuccessListener(unused -> {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> call.reject("Falha ao rejeitar conexão Nearby: " + e.getMessage(), e));
    }

    @PluginMethod
    public void sendPayload(PluginCall call) {
        String endpointId = call.getString("endpointId");
        String payloadStr = call.getString("payload");

        if (endpointId == null || payloadStr == null) {
            call.reject("endpointId e payload são obrigatórios");
            return;
        }

        byte[] bytes = payloadStr.getBytes(StandardCharsets.UTF_8);
        Payload payload = Payload.fromBytes(bytes);
        Log.d(TAG, "sendPayload: to=" + endpointId + " bytes=" + bytes.length);

        getOrRefreshConnectionsClient().sendPayload(endpointId, payload)
                .addOnSuccessListener(unused -> {
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "sendPayload falhou para " + endpointId + ": " + e.getMessage(), e);
                    call.reject("Falha ao enviar dados Nearby: " + e.getMessage(), e);
                });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String endpointId = call.getString("endpointId");
        try {
            ConnectionsClient client = getOrRefreshConnectionsClient();
            if (endpointId != null && !endpointId.isEmpty()) {
                client.disconnectFromEndpoint(endpointId);
            } else {
                client.stopAllEndpoints();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao desconectar: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopAllEndpoints(PluginCall call) {
        try {
            ConnectionsClient client = getOrRefreshConnectionsClient();
            if (isAdvertising) {
                client.stopAdvertising();
                isAdvertising = false;
            }
            if (isDiscovering) {
                client.stopDiscovery();
                isDiscovering = false;
            }
            client.stopAllEndpoints();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (SecurityException se) {
            Log.w(TAG, "stopAllEndpoints ignorado antes da concessão completa: " + se.getMessage());
            isAdvertising = false;
            isDiscovering = false;
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao encerrar todas as conexões: " + e.getMessage(), e);
        }
    }

    private List<String> getRequiredPermissionsForCurrentSdk() {
        List<String> permissions = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_SCAN);
            permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE);
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT);
        } else {
            permissions.add(Manifest.permission.BLUETOOTH);
            permissions.add(Manifest.permission.BLUETOOTH_ADMIN);
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
        } else {
            permissions.add(Manifest.permission.NEARBY_WIFI_DEVICES);
        }

        return permissions;
    }
}
