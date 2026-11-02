import Foundation
import Capacitor

/// Bridge between the web app and the car screen.
/// JS → native: setLibrary({ sections }), ready() → { pending }
/// native → JS: "select" { id }
@objc(CarPlayPlugin)
public class CarPlayPlugin: CAPPlugin, CAPBridgedPlugin {
    static let shared = CarPlayPlugin()

    public let identifier = "CarPlayPlugin"
    public let jsName = "CarPlay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setLibrary", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ready", returnType: CAPPluginReturnPromise),
    ]

    static let libraryChanged = Notification.Name("QuranonCarPlayLibraryChanged")
    private static let storeKey = "carplay.library"

    private var jsReady = false
    private var pendingSelection: String?

    /// Last library sent by the web app (kept on disk so the car can show it before the app loads).
    static var sections: [[String: Any]] {
        get { (UserDefaults.standard.array(forKey: storeKey) as? [[String: Any]]) ?? [] }
        set { UserDefaults.standard.set(newValue, forKey: storeKey) }
    }

    @objc func setLibrary(_ call: CAPPluginCall) {
        let sections = (call.getArray("sections") as? [[String: Any]]) ?? []
        Self.sections = sections
        DispatchQueue.main.async { NotificationCenter.default.post(name: Self.libraryChanged, object: nil) }
        call.resolve()
    }

    @objc func ready(_ call: CAPPluginCall) {
        jsReady = true
        let pending = pendingSelection
        pendingSelection = nil
        call.resolve(pending.map { ["pending": $0] } ?? [:])
    }

    /// Called by the car screen when the driver picks an item.
    func select(_ id: String) {
        if jsReady {
            notifyListeners("select", data: ["id": id])
        } else {
            pendingSelection = id
            _ = AppShell.shared.controller // make sure the web app is running
        }
    }
}
