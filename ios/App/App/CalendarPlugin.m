#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// This file provides the Objective-C bridge for the Swift CalendarPlugin
// It registers the plugin methods with Capacitor's plugin system

CAP_PLUGIN(CalendarPlugin, "CalendarPlugin",
    CAP_PLUGIN_METHOD(requestPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getRecurringEvents, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getCalendars, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateWidgetData, CAPPluginReturnPromise);
)
