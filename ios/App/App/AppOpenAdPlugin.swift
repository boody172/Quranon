import Foundation
import Capacitor
import GoogleMobileAds

/// Google "App Open" ads: the only ad format AdMob allows when an app opens or returns from the background.
/// JS: AppOpenAd.load({ adUnitId }) then AppOpenAd.show(). Consent (UMP), tracking permission and SDK start
/// are handled by @capacitor-community/admob before this is used.
@objc(AppOpenAdPlugin)
public class AppOpenAdPlugin: CAPPlugin, CAPBridgedPlugin, FullScreenContentDelegate {
    public let identifier = "AppOpenAdPlugin"
    public let jsName = "AppOpenAd"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
    ]

    private static let maxAge: TimeInterval = 4 * 3600 // a loaded app-open ad expires after 4 hours
    private var ad: AppOpenAd?
    private var loadedAt = Date.distantPast
    private var showCall: CAPPluginCall?

    @objc func load(_ call: CAPPluginCall) {
        guard let adUnitId = call.getString("adUnitId"), !adUnitId.isEmpty else {
            call.reject("adUnitId required")
            return
        }
        DispatchQueue.main.async {
            AppOpenAd.load(with: adUnitId, request: Request()) { [weak self] ad, error in
                if let error {
                    call.reject(error.localizedDescription)
                    return
                }
                self?.ad = ad
                self?.loadedAt = Date()
                ad?.fullScreenContentDelegate = self
                call.resolve()
            }
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let ad = self.ad, Date().timeIntervalSince(self.loadedAt) < Self.maxAge,
                  let viewController = self.bridge?.viewController else {
                self.ad = nil
                call.reject("not loaded")
                return
            }
            self.showCall = call
            ad.present(from: viewController)
        }
    }

    public func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        self.ad = nil
        showCall?.resolve()
        showCall = nil
    }

    public func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        self.ad = nil
        showCall?.reject(error.localizedDescription)
        showCall = nil
    }
}
