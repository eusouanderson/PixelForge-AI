package ai.pixelforge.virtualcreatures;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(
    name = "PetCareNotifications",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class PetCareNotificationsPlugin extends Plugin {

    private static final String PREFS_NAME = "PixelForgePetNotifications";
    private static final String KEY_SCHEDULED_IDS = "scheduled_ids";

    private String resolvePermissionString() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return NotificationManagerCompat.from(getContext()).areNotificationsEnabled()
                ? "granted"
                : "denied";
        }

        PermissionState state = getPermissionState("notifications");
        if (state == PermissionState.GRANTED) {
            return "granted";
        }
        if (state == PermissionState.DENIED) {
            return "denied";
        }
        return "prompt";
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("state", resolvePermissionString());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("notifications", call, "notificationsCallback");
        } else {
            checkPermission(call);
        }
    }

    @PermissionCallback
    private void notificationsCallback(PluginCall call) {
        checkPermission(call);
    }

    @PluginMethod
    public void showNow(PluginCall call) {
        int id = call.getInt("id", 1001);
        String title = call.getString("title", "PixelForge: Alerta de Cuidado");
        String body = call.getString("body", "Seu dinossauro precisa de cuidados!");
        String severity = call.getString("severity", "warning");

        boolean displayed = PetCareNotificationReceiver.displayNotification(
            getContext(),
            id,
            title,
            body,
            severity
        );

        JSObject ret = new JSObject();
        ret.put("displayed", displayed);
        call.resolve(ret);
    }

    @PluginMethod
    public void schedulePending(PluginCall call) {
        Context context = getContext();
        cancelTrackedAlarms(context);

        JSArray array = call.getArray("notifications");
        if (array == null) {
            JSObject ret = new JSObject();
            ret.put("scheduledCount", 0);
            call.resolve(ret);
            return;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            JSObject ret = new JSObject();
            ret.put("scheduledCount", 0);
            call.resolve(ret);
            return;
        }

        Set<String> scheduledIds = new HashSet<>();
        long nowMs = System.currentTimeMillis();
        int scheduledCount = 0;

        for (int i = 0; i < array.length(); i++) {
            JSONObject obj = array.optJSONObject(i);
            if (obj == null) {
                continue;
            }
            int id = obj.optInt("id", 1100 + i);
            String title = obj.optString("title", "PixelForge: Alerta de Cuidado");
            String body = obj.optString("body", "Seu dinossauro precisa de atenção.");
            String severity = obj.optString("severity", "warning");
            long triggerAtMs = obj.optLong("triggerAtMs", 0L);

            if (triggerAtMs <= nowMs) {
                continue;
            }

            PendingIntent pendingIntent = createAlarmPendingIntent(context, id, title, body, severity);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            }
            scheduledIds.add(String.valueOf(id));
            scheduledCount++;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putStringSet(KEY_SCHEDULED_IDS, scheduledIds).apply();

        JSObject ret = new JSObject();
        ret.put("scheduledCount", scheduledCount);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        Context context = getContext();
        cancelTrackedAlarms(context);

        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancelAll();
        }

        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        call.resolve(ret);
    }

    private void cancelTrackedAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        Set<String> previousIds = prefs.getStringSet(KEY_SCHEDULED_IDS, null);
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (previousIds != null && alarmManager != null) {
            for (String rawId : previousIds) {
                try {
                    int id = Integer.parseInt(rawId);
                    PendingIntent pendingIntent = createAlarmPendingIntent(context, id, "", "", "warning");
                    alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel();
                } catch (NumberFormatException ignored) {
                    // Ignore malformed ID entry
                }
            }
        }
        prefs.edit().remove(KEY_SCHEDULED_IDS).apply();
    }

    private PendingIntent createAlarmPendingIntent(
        Context context,
        int id,
        String title,
        String body,
        String severity
    ) {
        Intent intent = new Intent(context, PetCareNotificationReceiver.class);
        intent.putExtra(PetCareNotificationReceiver.EXTRA_ID, id);
        intent.putExtra(PetCareNotificationReceiver.EXTRA_TITLE, title);
        intent.putExtra(PetCareNotificationReceiver.EXTRA_BODY, body);
        intent.putExtra(PetCareNotificationReceiver.EXTRA_SEVERITY, severity);

        return PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
