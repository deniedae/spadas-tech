package com.spadas.ai

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

/**
 * SpadasWidgetProvider provides a sleek dark-mode Reseller Dashboard home screen widget.
 * Features live inventory status, estimated profit, and a 1-tap "⚡ Quick Scan" button.
 */
class SpadasWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_spadas)

            // Intent to launch Spadas Lens Scanner
            val lensIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://spadas-tech.vercel.app/lens")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val lensPendingIntent = PendingIntent.getActivity(
                context,
                101,
                lensIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.btn_widget_scan, lensPendingIntent)

            // Intent to open Dashboard
            val dashIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://spadas-tech.vercel.app/dashboard")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val dashPendingIntent = PendingIntent.getActivity(
                context,
                102,
                dashIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_container, dashPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
