package ai.pixelforge.virtualcreatures;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.os.Build;
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

    private ConnectionsClient connectionsClient;
    private boolean isAdvertising = false;
    private boolean isDiscovering = false;

    @Override
    public void load() {
        super.load();
        connectionsClient = Nearby.getConnectionsClient(getContext());
        Log.d(TAG, "Plugin NearbyConnections inicializado.");
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
                if (isAdvertising) {
                    connectionsClient.stopAdvertising();
                    isAdvertising = false;
                }
                if (isDiscovering) {
                    connectionsClient.stopDiscovery();
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
        Context context = getContext();
        List<String> requiredPermissions = getRequiredPermissionsForCurrentSdk();
        List<String> missingPermissions = new ArrayList<>();

        for (String permission : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED) {
                missingPermissions.add(permission);
            }
        }

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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAliases(new String[]{"nearby_bluetooth", "nearby_wifi", "nearby_location"}, call, "nearbyPermissionsCallback");
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAliases(new String[]{"nearby_bluetooth", "nearby_location"}, call, "nearbyPermissionsCallback");
        } else {
            requestPermissionForAlias("nearby_location", call, "nearbyPermissionsCallback");
        }
    }

    @PermissionCallback
    private void nearbyPermissionsCallback(PluginCall call) {
        checkPermissions(call);
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
            LocationManager locManager = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
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

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        String endpointName = call.getString("endpointName", "PixelForge-Player");
        String serviceId = call.getString("serviceId", DEFAULT_SERVICE_ID);

        AdvertisingOptions options = new AdvertisingOptions.Builder()
                .setStrategy(STRATEGY)
                .build();

        connectionsClient.startAdvertising(endpointName, serviceId, connectionLifecycleCallback, options)
                .addOnSuccessListener(unused -> {
                    isAdvertising = true;
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    if (e instanceof ApiException && ((ApiException) e).getStatusCode() == ConnectionsStatusCodes.STATUS_ALREADY_ADVERTISING) {
                        isAdvertising = true;
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                        return;
                    }
                    isAdvertising = false;
                    String diag = getHardwareDiagnostics();
                    call.reject("Falha ao iniciar anúncio Nearby: " + e.getMessage() + diag, e);
                });
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        try {
            connectionsClient.stopAdvertising();
            isAdvertising = false;
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao parar anúncio: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        String serviceId = call.getString("serviceId", DEFAULT_SERVICE_ID);

        DiscoveryOptions options = new DiscoveryOptions.Builder()
                .setStrategy(STRATEGY)
                .build();

        connectionsClient.startDiscovery(serviceId, endpointDiscoveryCallback, options)
                .addOnSuccessListener(unused -> {
                    isDiscovering = true;
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> {
                    if (e instanceof ApiException && ((ApiException) e).getStatusCode() == ConnectionsStatusCodes.STATUS_ALREADY_DISCOVERING) {
                        isDiscovering = true;
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                        return;
                    }
                    isDiscovering = false;
                    String diag = getHardwareDiagnostics();
                    call.reject("Falha ao iniciar descoberta Nearby: " + e.getMessage() + diag, e);
                });
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        try {
            connectionsClient.stopDiscovery();
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

        connectionsClient.requestConnection(endpointName, endpointId, connectionLifecycleCallback)
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

        connectionsClient.acceptConnection(endpointId, payloadCallback)
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

        connectionsClient.rejectConnection(endpointId)
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

        connectionsClient.sendPayload(endpointId, payload)
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
            if (endpointId != null && !endpointId.isEmpty()) {
                connectionsClient.disconnectFromEndpoint(endpointId);
            } else {
                connectionsClient.stopAllEndpoints();
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
            connectionsClient.stopAdvertising();
            isAdvertising = false;
            connectionsClient.stopDiscovery();
            isDiscovering = false;
            connectionsClient.stopAllEndpoints();

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
