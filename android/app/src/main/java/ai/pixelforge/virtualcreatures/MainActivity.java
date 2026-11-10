package ai.pixelforge.virtualcreatures;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(NearbyConnectionsPlugin.class);
        registerPlugin(PetCareNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
