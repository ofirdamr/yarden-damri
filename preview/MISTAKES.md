
## Mistake: Hidden items showing in lightbox
- **Cause**: `applyFilter('all')` was called before `RemoteState.fetchPublic()` completed, so `allFilteredImages` was built without hidden items loaded yet
- **Fix**: Delay initial `applyFilter` until after `fetchPublic()` resolves
- **Rule**: Always await RemoteState before first render when hidden items must be excluded

## Mistake: getAdminSettings() used localStorage in root gallery
- **Cause**: Root gallery.html had `getAdminSettings()` reading from localStorage instead of RemoteState
- **Fix**: Updated to use `RemoteState.getAdmin()` with localStorage as fallback
- **Rule**: Always use RemoteState for shared state, never localStorage for business data
