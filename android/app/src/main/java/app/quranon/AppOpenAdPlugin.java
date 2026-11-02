package app.quranon;

import androidx.annotation.NonNull;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.appopen.AppOpenAd;

/**
 * Google "App Open" ads: the only ad format AdMob allows when an app opens or returns from the background.
 * JS: AppOpenAd.load({ adUnitId }) then AppOpenAd.show(). Consent (UMP) and SDK start are handled by
 * @capacitor-community/admob before this is used.
 */
@CapacitorPlugin(name = "AppOpenAd")
public class AppOpenAdPlugin extends Plugin {
    private static final long MAX_AGE_MS = 4 * 3600 * 1000L; // Google: a loaded app-open ad expires after 4 hours
    private AppOpenAd ad;
    private long loadedAt;

    @PluginMethod
    public void load(PluginCall call) {
        String adUnitId = call.getString("adUnitId");
        if (adUnitId == null || adUnitId.isEmpty()) {
            call.reject("adUnitId required");
            return;
        }
        getActivity().runOnUiThread(() -> AppOpenAd.load(getContext(), adUnitId, new AdRequest.Builder().build(),
            new AppOpenAd.AppOpenAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull AppOpenAd loaded) {
                    ad = loaded;
                    loadedAt = System.currentTimeMillis();
                    call.resolve();
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError error) {
                    ad = null;
                    call.reject(error.getMessage());
                }
            }));
    }

    @PluginMethod
    public void show(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (ad == null || System.currentTimeMillis() - loadedAt > MAX_AGE_MS) {
                ad = null;
                call.reject("not loaded");
                return;
            }
            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                    ad = null;
                    call.resolve();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError error) {
                    ad = null;
                    call.reject(error.getMessage());
                }
            });
            ad.show(getActivity());
        });
    }
}
