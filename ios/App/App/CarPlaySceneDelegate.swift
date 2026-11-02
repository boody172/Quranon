import CarPlay
import UIKit

/// The car screen: tabs of lists (listen / saved / radio). Picking an item starts it in the app's player
/// and opens the system "Now Playing" screen, which reads the same lock-screen metadata and controls.
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?
    private var observer: NSObjectProtocol?

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        _ = AppShell.shared.controller // boot the web app if the phone app isn't open
        interfaceController.setRootTemplate(makeRoot(), animated: false, completion: nil)
        observer = NotificationCenter.default.addObserver(forName: CarPlayPlugin.libraryChanged, object: nil, queue: .main) { [weak self] _ in
            self?.reload()
        }
    }

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene,
                                  didDisconnectInterfaceController interfaceController: CPInterfaceController) {
        if let observer { NotificationCenter.default.removeObserver(observer) }
        self.interfaceController = nil
    }

    private func reload() {
        guard let interfaceController else { return }
        // Keep the driver where they are if they are on Now Playing; otherwise refresh the lists in place.
        if let tabs = interfaceController.rootTemplate as? CPTabBarTemplate {
            tabs.updateTemplates(makeTabs())
        } else {
            interfaceController.setRootTemplate(makeRoot(), animated: false, completion: nil)
        }
    }

    private func makeRoot() -> CPTemplate {
        CPTabBarTemplate(templates: makeTabs())
    }

    private func makeTabs() -> [CPTemplate] {
        let sections = CarPlayPlugin.sections
        if sections.isEmpty {
            let item = CPListItem(text: "افتح قرآنون على الهاتف مرة واحدة", detailText: "Open Quranon on your phone once")
            let list = CPListTemplate(title: "قرآنون", sections: [CPListSection(items: [item])])
            list.tabImage = UIImage(systemName: "book")
            return [list]
        }
        return sections.prefix(4).map { section in
            let title = section["title"] as? String ?? ""
            let rows = (section["items"] as? [[String: Any]] ?? []).prefix(CPListTemplate.maximumItemCount).map { row -> CPListItem in
                let item = CPListItem(text: row["title"] as? String, detailText: (row["detail"] as? String).flatMap { $0.isEmpty ? nil : $0 })
                let id = row["id"] as? String ?? ""
                item.handler = { [weak self] _, completion in
                    CarPlayPlugin.shared.select(id)
                    self?.showNowPlaying()
                    completion()
                }
                return item
            }
            let list = CPListTemplate(title: title, sections: [CPListSection(items: Array(rows))])
            if rows.isEmpty, let empty = section["empty"] as? String {
                list.emptyViewSubtitleVariants = [empty]
            }
            list.tabTitle = title
            list.tabImage = UIImage(systemName: section["icon"] as? String ?? "music.note")
            return list
        }
    }

    private func showNowPlaying() {
        guard let interfaceController else { return }
        let nowPlaying = CPNowPlayingTemplate.shared
        if interfaceController.topTemplate !== nowPlaying {
            interfaceController.pushTemplate(nowPlaying, animated: true, completion: nil)
        }
    }
}
