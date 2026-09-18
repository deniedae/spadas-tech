package com.spadas.ai

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

/**
 * SpadasWidgetProvider provides a sleek dark-mode Reseller Dashboard home screen widget.
 * Features live inventory status, estimated profit (synced via SharedPreferences / intents),
 * and a 1-tap "⚡ Quick Scan" button that directly opens Spadas Lens.
 */
class SpadasWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_UPDATE_STATS = "com.spadas.ai.UPDATE_WIDGET_STATS"
        const val EXTRA_PROFIT_TEXT = "extra_profit_text"
        const val PREFS_NAME = "spadas_widget_prefs"
        const val KEY_PROFIT_VALUE = "key_profit_value"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_spadas)

            // Read live cached profit from SharedPreferences
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val cachedProfit = prefs.getString(KEY_PROFIT_VALUE, "$1,420 AUD")
            views.setTextViewText(R.id.txt_stat_profit, cachedProfit)

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

        /**
         * Helper to broadcast new stats to all active Spadas widgets.
         */
        fun updateAllWidgets(context: Context, profitText: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_PROFIT_VALUE, profitText).apply()

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, SpadasWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (widgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, widgetId)
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_UPDATE_STATS) {
            val newProfit = intent.getStringExtra(EXTRA_PROFIT_TEXT) ?: return
            updateAllWidgets(context, newProfit)
        }
    }
}
