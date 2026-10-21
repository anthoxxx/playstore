# Le pont JavaScript doit garder ses méthodes annotées.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
