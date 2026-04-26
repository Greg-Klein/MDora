use semver::Version;
use serde::{Deserialize, Serialize};

const RELEASES_URL: &str =
    "https://api.github.com/repos/Greg-Klein/MDora/releases/latest";
const USER_AGENT: &str = concat!("MDora/", env!("CARGO_PKG_VERSION"));

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    #[serde(default)]
    body: String,
    #[serde(default)]
    draft: bool,
    #[serde(default)]
    prerelease: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub url: String,
    pub notes: String,
}

#[tauri::command]
pub async fn check_for_update(
    app: tauri::AppHandle,
) -> Result<Option<UpdateInfo>, String> {
    let current_raw = app.package_info().version.to_string();
    let current = Version::parse(&current_raw).map_err(|e| e.to_string())?;

    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(RELEASES_URL)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("github responded {}", resp.status()));
    }

    let release: GitHubRelease = resp.json().await.map_err(|e| e.to_string())?;

    if release.draft || release.prerelease {
        return Ok(None);
    }

    let latest_str = release.tag_name.trim_start_matches('v');
    let latest = Version::parse(latest_str).map_err(|e| e.to_string())?;

    if latest > current {
        Ok(Some(UpdateInfo {
            version: latest.to_string(),
            url: release.html_url,
            notes: release.body,
        }))
    } else {
        Ok(None)
    }
}
