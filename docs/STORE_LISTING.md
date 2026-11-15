# Chrome Web Store listing

## Name
صافي: نتائج بحث بلا مزارع محتوى (Safi)

## Short description (132 chars max)
ينظّف نتائج البحث من مزارع المحتوى والمواقع المولَّدة آليًا. يعمل محليًا بلا جمع بيانات.

## Category
Productivity → Search Tools

## Detailed description (Arabic)
تبحث عن معلومة فتجد الصفحة الأولى مليئة بمواقع تنسخ المقالات أو تولّدها آليًا لتتصدر النتائج. صافي يضع علامة واضحة على هذه النتائج، أو يخفيها إن أردت.

ما يفعله:
• يعلّم النتائج القادمة من مواقع مدرجة في قوائم علنية، ويذكر اسم القائمة.
• زر "حجب هذا الموقع" بجانب كل نتيجة: ضغطة واحدة تخفيه من بحثك دائمًا.
• زر "هذا الموقع سليم" يستثني أي موقع، وقرارك يغلب أي قائمة.
• يعمل على Google وBing وDuckDuckGo، بواجهة عربية وإنجليزية.

الخصوصية:
صافي لا يرسل عمليات بحثك ولا المواقع التي تزورها إلى أي خادم. المطابقة تتم داخل متصفحك، والاتصال الوحيد هو تنزيل ملفات القوائم.

مفتوح المصدر: github.com/Alsakkaf-dev/safi

ملاحظة: القائمة العربية جديدة وتُبنى من بلاغات المستخدمين المراجَعة. يمكنك التبليغ عن أي موقع من داخل الإضافة.

## Detailed description (English)
Safi marks or hides search results that come from content farms and machine-made spam sites, using public, human-reviewed lists. Block any site from your results in one click, exempt any site you trust, and report sites to the open Arabic list. Works on Google, Bing and DuckDuckGo. Nothing about your searches leaves your browser. Open source.

## Single purpose
Mark or hide low-quality sites in search engine result pages using block lists.

## Permission justifications
- storage, unlimitedStorage: keep settings and downloaded block lists (some lists exceed the default quota) on the device.
- alarms: refresh subscribed lists once a day.
- Host permission raw.githubusercontent.com: download the public list files.
- Optional host permissions: requested only when the user adds a list hosted elsewhere, for that host only.
- Content scripts on Google, Bing, DuckDuckGo result pages: read result links to compare their domains with the lists and add the marking UI.

## Data usage
Collects no user data. Not sold, not transferred, not used for unrelated purposes.

## Privacy policy URL
https://github.com/Alsakkaf-dev/safi/blob/main/PRIVACY.md
