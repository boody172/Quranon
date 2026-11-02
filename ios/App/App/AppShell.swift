import UIKit
import Capacitor

/// One web app instance shared by the phone screen and the car screen.
/// If the driver starts Quranon from CarPlay first, the web app boots without a phone window,
/// and the phone reuses the same instance later — so there is only ever one player.
final class AppShell {
    static let shared = AppShell()

    private(set) lazy var controller: UIViewController = {
        let vc = UIStoryboard(name: "Main", bundle: nil).instantiateInitialViewController() ?? MainViewController()
        _ = vc.view // load the web view now, even with no window on screen
        return vc
    }()
}

/// The Capacitor screen, with Quranon's own native plugins registered.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CarPlayPlugin.shared)
    }
}
