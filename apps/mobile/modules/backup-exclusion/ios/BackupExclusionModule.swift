import ExpoModulesCore

public class BackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackupExclusion")

    // Application Support, not Caches: iOS may purge Caches under storage pressure, and the
    // database holds sets that haven't uploaded yet. The flag goes on the directory so the
    // -wal and -shm files SQLite creates later are covered too.
    Function("prepareDatabaseDirectory") { () throws -> String in
      let base = try FileManager.default.url(
        for: .applicationSupportDirectory,
        in: .userDomainMask,
        appropriateFor: nil,
        create: true
      )
      var directory = base.appendingPathComponent("compound-db", isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try directory.setResourceValues(values)
      return directory.path
    }

    Function("isExcludedFromBackup") { (path: String) throws -> Bool in
      let values = try URL(fileURLWithPath: path, isDirectory: true)
        .resourceValues(forKeys: [.isExcludedFromBackupKey])
      return values.isExcludedFromBackup ?? false
    }
  }
}
