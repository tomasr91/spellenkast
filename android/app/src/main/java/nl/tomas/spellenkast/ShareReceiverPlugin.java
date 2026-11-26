package nl.tomas.spellenkast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Geeft tekst die via het Android-deelmenu naar Quickplay is gedeeld door aan de app.
 * - getShared(): haalt een gedeelde tekst op die binnenkwam voordat de app klaar was.
 * - event "shared": tekst die binnenkomt terwijl de app al draait.
 */
@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {
    private static String pending = null;
    private static ShareReceiverPlugin instance = null;

    @Override
    public void load() {
        instance = this;
    }

    static void receive(String text) {
        if (text == null || text.trim().isEmpty()) return;
        pending = text;
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("text", text);
            instance.notifyListeners("shared", data, true);
        }
    }

    @PluginMethod
    public void getShared(PluginCall call) {
        JSObject result = new JSObject();
        result.put("text", pending);
        pending = null;
        call.resolve(result);
    }
}
