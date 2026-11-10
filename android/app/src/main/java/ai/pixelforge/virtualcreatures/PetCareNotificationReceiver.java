package ai.pixelforge.virtualcreatures;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class PetCareNotificationReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "pixelforge_pet_care_alerts";
    public static final String CHANNEL_NAME = "Cuidados com o Dinossauro";
    public static final String EXTRA_ID = "notification_id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    public static final String EXTRA_SEVERITY = "severity";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }
        int id = intent.getIntExtra(EXTRA_ID, 1001);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        String severity = intent.getStringExtra(EXTRA_SEVERITY);

        if (title == null || title.isEmpty()) {
            title = "PixelForge: Cuide do seu Dinossauro!";
        }
        if (body == null || body.isEmpty()) {
            body = "Uma necessidade está próxima do nível crítico. Abra o app para cuidar dele.";
        }

        displayNotification(context, id, title, body, severity);
    }

    @SuppressLint("NotificationPermission")
    public static boolean displayNotification(
        Context context,
        int id,
        String title,
        String body,
        String severity
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }

        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            return false;
        }

        ensureNotificationChannel(notificationManager);

        PendingIntent contentIntent = createLaunchIntent(context, id);
        int priority = "critical".equals(severity)
            ? NotificationCompat.PRIORITY_HIGH
            : NotificationCompat.PRIORITY_DEFAULT;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(priority)
            .setAutoCancel(true);

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
        }

        notificationManager.notify(id, builder.build());
        return true;
    }

    private static void ensureNotificationChannel(NotificationManager notificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel existing = notificationManager.getNotificationChannel(CHANNEL_ID);
            if (existing == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Alertas quando seu dinossauro está próximo ou em nível crítico de cuidados.");
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private static PendingIntent createLaunchIntent(Context context, int requestCode) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            return null;
        }
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
            context,
            requestCode,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
