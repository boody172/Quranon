package app.quranon;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppOpenAdPlugin.class); // app-open ads (js/ads.js)
        super.onCreate(savedInstanceState);
    }
}
