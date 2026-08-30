package com.spadas.ai

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import androidx.browser.customtabs.CustomTabsIntent

/**
 * QuickScanTileService provides a Quick Settings pull-down tile in the Android notification shade.
 * Resellers can tap "⚡ Spadas Scan" from ANY screen or app to immediately launch the scanner.
 */
class QuickScanTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        val tile = qsTile ?: return
        tile.state = Tile.STATE_ACTIVE
        tile.label = getString(R.string.tile_quick_scan_label)
        tile.contentDescription = getString(R.string.tile_quick_scan_desc)
        tile.updateTile()
    }

    override fun onClick() {
        super.onClick()

        val lensUrl = "https://spadas-tech.vercel.app/lens"
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(lensUrl)).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ PendingIntent requirement for TileService
            val pendingIntent = android.app.PendingIntent.getActivity(
                this,
                0,
                intent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )
            startActivityAndCollapse(pendingIntent)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
