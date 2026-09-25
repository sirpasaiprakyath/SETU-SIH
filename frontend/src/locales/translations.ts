export interface TranslationItem {
  en: string;
  hi: string;
}

export const translations: Record<string, TranslationItem> = {
  // Top Accessibility & Ministry Bar
  "header.gov": {
    en: "Government of India",
    hi: "भारत सरकार"
  },
  "header.ministry": {
    en: "Ministry of Home Affairs",
    hi: "गृह मंत्रालय"
  },
  "header.forces": {
    en: "CRPF (Police-II Division, MHA • Pan-CAPF Scalable)",
    hi: "सीआरपीएफ (पुलिस-II प्रभाग, गृह मंत्रालय • अखिल-सीएपीएफ विस्तारणीय)"
  },
  "header.brand_title": {
    en: "SETU",
    hi: "सेतु"
  },
  "header.brand_tagline": {
    en: "Guardian Minds",
    hi: "गार्जियन माइंड्स"
  },
  "header.brand_subtitle": {
    en: "CRPF Personnel Welfare Monitoring System",
    hi: "सीआरपीएफ कार्मिक कल्याण निगरानी प्रणाली"
  },
  "header.overview": {
    en: "Overview & Why",
    hi: "सिंहावलोकन एवं उद्देश्य"
  },
  "header.charter": {
    en: "AI Charter",
    hi: "एआई चार्टर"
  },
  "header.signout": {
    en: "Sign Out",
    hi: "लॉग आउट"
  },
  "header.switch_role": {
    en: "Switch Role",
    hi: "भूमिका बदलें"
  },
  "header.size": {
    en: "Size:",
    hi: "आकार:"
  },

  // Personnel Navigation Tabs
  "nav.dossier": {
    en: "Duty Roster & Service Dossier",
    hi: "ड्यूटी रोस्टर एवं सेवा डोज़ियर"
  },
  "nav.dashboard": {
    en: "Welfare & Health Dashboard",
    hi: "कल्याण एवं स्वास्थ्य डैशबोर्ड"
  },
  "nav.peer_guard": {
    en: "Saathi Peer Guard (Buddy Drop Box)",
    hi: "साथी पियर गार्ड (बडी ड्रॉप बॉक्स)"
  },

  // Personnel Welcome Strip
  "personnel.welcome": {
    en: "Welcome",
    hi: "स्वागत है"
  },
  "personnel.service_record_badge": {
    en: "CRPF Personnel Service Record",
    hi: "सीआरपीएफ कार्मिक सेवा रिकॉर्ड"
  },
  "personnel.open_saathi": {
    en: "Open Saathi",
    hi: "साथी खोलें"
  },
  "personnel.talk_someone": {
    en: "Talk to someone",
    hi: "सहायता अधिकारी से बात करें"
  },

  // Welfare Cell Notices
  "welfare_notice.title": {
    en: "Welfare Cell Outreach & Active Notices",
    hi: "कल्याण प्रकोष्ठ संपर्क एवं सक्रिय सूचनाएं"
  },
  "welfare_notice.confidential": {
    en: "Confidential Desk",
    hi: "गोपनीय डेस्क"
  },
  "welfare_notice.invitation_title": {
    en: "Informal Welfare Check-In Invitation",
    hi: "अनौपचारिक कल्याण संवाद आमंत्रण"
  },
  "welfare_notice.invitation_desc": {
    en: "Would you like a quick informal chat with the welfare officer? Entirely your choice — nothing is recorded if you'd rather not.",
    hi: "क्या आप कल्याण अधिकारी के साथ अनौपचारिक बातचीत करना चाहते हैं? यह पूरी तरह आपका निर्णय है — यदि आप नहीं चाहते तो कुछ भी दर्ज नहीं किया जाएगा।"
  },
  "welfare_notice.accept": {
    en: "Yes, set up an informal chat",
    hi: "हाँ, अनौपचारिक बातचीत निर्धारित करें"
  },
  "welfare_notice.decline": {
    en: "No thanks (Zero record created)",
    hi: "जी नहीं, धन्यवाद (कोई रिकॉर्ड दर्ज नहीं)"
  },

  // Monthly Medical Camp Vitals
  "vitals.title": {
    en: "Monthly Medical Camp Vitals",
    hi: "मासिक मेडिकल कैंप वाइटल्स (शारीरिक माप)"
  },
  "vitals.badge": {
    en: "Raw Health Record",
    hi: "मूल स्वास्थ्य रिकॉर्ड"
  },
  "vitals.desc": {
    en: "Logged during mandatory monthly battalion medical camps • Raw diagnostic readings only",
    hi: "अनिवार्य मासिक बटालियन मेडिकल कैंप के दौरान दर्ज • केवल मूल नैदानिक माप"
  },
  "vitals.latest": {
    en: "Latest Camp Recorded",
    hi: "नवीनतम कैंप दर्ज"
  },
  "vitals.bp": {
    en: "Blood Pressure",
    hi: "रक्तचाप (बीपी)"
  },
  "vitals.bp_sub": {
    en: "Systolic / Diastolic examination",
    hi: "सिस्टोलिक / डायस्टोलिक परीक्षण"
  },
  "vitals.weight": {
    en: "Body Weight",
    hi: "शारीरिक वजन"
  },
  "vitals.weight_sub": {
    en: "Camp scale measurement",
    hi: "कैंप स्केल माप"
  },
  "vitals.sugar": {
    en: "Blood Sugar",
    hi: "ब्लड शुगर (रक्त शर्करा)"
  },
  "vitals.sugar_sub": {
    en: "Blood glucose reading",
    hi: "रक्त ग्लूकोज स्तर"
  },
  "vitals.history_title": {
    en: "Historical Camp Readings Trend (3 Past Camps)",
    hi: "विगत कैंप स्वास्थ्य माप रुझान (पिछले 3 कैंप)"
  },
  "vitals.history_sub": {
    en: "Raw numerical trajectory over trailing camps",
    hi: "पिछले कैंपों का मूल संख्यात्मक डेटा"
  },

  // Bottom Welfare line
  "footer.welfare_line": {
    en: "Welfare Assistance Line: Sector HQ Welfare Officer • Direct Intercom: 4102 (Confidential & Standing)",
    hi: "कल्याण सहायता लाइन: सेक्टर मुख्यालय कल्याण अधिकारी • सीधा इंटरकॉम: 4102 (गोपनीय एवं निरंतर)"
  },
  "footer.directive": {
    en: "MHA Welfare Directive 2026",
    hi: "गृह मंत्रालय कल्याण निर्देश 2026"
  }
};

/**
 * Pre-written static translations for the Saathi Adaptive Question Tree,
 * Prompts, Titles, Options, Safety Net, and Opt-out messages.
 * 100% offline, zero external API calls.
 */
export const saathiTranslations: Record<string, string> = {
  // Question 1 Openers
  "It's been a demanding stretch out here. How are you holding up?": "यहाँ का समय काफी चुनौतीपूर्ण रहा है। आप कैसा महसूस कर रहे हैं?",
  "How's this week been for you, overall?": "कुल मिलाकर यह सप्ताह आपके लिए कैसा रहा?",
  "Settling back in after leave — how's it going?": "छुट्टी के बाद वापस ड्यूटी पर — कैसा चल रहा है?",
  "How's the routine treating you lately?": "आजकल दिनचर्या कैसी चल रही है?",
  "How has your physical rest and alertness felt across recent field patrol and night-vigil rotations?": "हालिया फील्ड गश्त और रात्रि ड्यूटी के दौरान आपका शारीरिक विश्राम और सतर्कता कैसी रही?",
  "How are outpost climate conditions, guard rotations, and your sleep recovery feeling lately?": "चौकी का मौसम, गार्ड रोटेशन और आपकी नींद का चक्र आजकल कैसा चल रहा है?",
  "How are static standing duties, transit footfall, and shift turnaround times treating your energy?": "लगातार खड़े रहने की ड्यूटी और शिफ्ट के बीच का समय आपकी ऊर्जा को कैसे प्रभावित कर रहा है?",
  "How are section administrative responsibilities, operational planning hours, and evening mental reset feeling?": "प्रशासनिक कार्यभार, योजना निर्माण और शाम का मानसिक विश्राम कैसा चल रहा है?",
  "How has your daily station routine, training schedule, and personal downtime felt over the past week?": "पिछले सप्ताह आपकी दैनिक दिनचर्या, प्रशिक्षण और व्यक्तिगत विश्राम का अनुभव कैसा रहा?",

  // Question Titles
  "Check-In Opening": "संवाद प्रारंभ",
  "Main Pressure Vector": "मुख्य चिंता का विषय",
  "Follow-Up Check": "फॉलो-अप जांच",
  "Workload vs Location": "कार्यभार बनाम स्थान",
  "Gradual Build-up vs Recent Event": "क्रमिक प्रभाव बनाम हालिया घटना",
  "Scheduled Rest Days": "निर्धारित विश्राम दिवस",
  "Sleep Recovery": "नींद एवं शारीरिक विश्राम",
  "Personal vs Visible Strain": "व्यक्तिगत बनाम दृश्य तनाव",
  "Buddy / Informal Support": "साथी / अनौपचारिक सहयोग",
  "Commander Awareness": "कमांडर को अवगत कराना",
  "Closing Reflection": "अंतिम विचार",
  "Closing Reflection & Private Notes (Optional)": "अंतिम विचार एवं निजी नोट्स (वैकल्पिक)",
  "Missing Them vs Specific Issue": "परिवार की याद बनाम विशेष मुद्दा",
  "Immediate vs Extended Family": "परिवार का स्वरूप",
  "Domestic Support at Home": "घर पर सहायता",
  "Communication Frequency": "बातचीत की आवृत्ति",
  "Specific Worry vs General Burden": "विशिष्ट चिंता बनाम सामान्य खिंचाव",
  "Unit Family Welfare Check": "यूनिट परिवार कल्याण जांच",
  "Upcoming Leave Timeline": "आगामी छुट्टी की समयावधि",
  "Sleep vs Physical Health": "नींद बनाम शारीरिक स्वास्थ्य",
  "Weekly Rest Patterns": "साप्ताहिक विश्राम चक्र",
  "Sleep Disruption Driver": "नींद में बाधा का कारण",
  "Physical Symptoms": "शारीरिक लक्षण",
  "Medical Camp Check": "मेडिकल कैंप जांच",
  "Camp Reminder": "कैंप रिमाइंडर",
  "Duration of Strain": "तनाव की अवधि",
  "Support Options vs Personal Note": "सहायता विकल्प बनाम व्यक्तिगत नोट",
  "One-Off vs Ongoing": "एक बार का बनाम निरंतर",
  "Family vs Personal Concern": "पारिवारिक बनाम व्यक्तिगत चिंता",
  "Department Welfare Funds": "विभागीय कल्याण कोष",
  "Confidential Welfare Cell Bridge": "गोपनीय कल्याण प्रकोष्ठ संपर्क",
  "Impact on Sleep & Focus": "नींद और एकाग्रता पर प्रभाव",
  "Financial Timeline": "वित्तीय समय-सीमा",
  "Field Event Flag": "फील्ड घटना संकेत",
  "Safety Net Bridge": "सुरक्षा संबल",
  "Private Reflection Sandbox": "निजी विचार स्पेस",
  "Duty & Night Vigil Rhythm": "ड्यूटी एवं रात्रि गश्त चक्र",
  "Outpost Climate & Sleep Rhythm": "चौकी का मौसम एवं नींद का चक्र",
  "Standing Duty & Shift Turnarounds": "स्थायी ड्यूटी एवं शिफ्ट चक्र",
  "Administrative & Supervisory Load": "प्रशासनिक एवं पर्यवेक्षी कार्यभार",
  "Daily Station Routine & Balance": "दैनिक स्टेशन दिनचर्या एवं संतुलन",

  // Branch Questions Prompts
  "What's been the main thing on your mind?": "मुख्य रूप से आपके मन में क्या चल रहा है?",
  "Good to hear. Anything at all you'd want to flag, even something small?": "यह जानकर अच्छा लगा। क्या आप कुछ भी बताना चाहते हैं, भले ही कोई छोटी सी बात हो?",
  "Is it more the workload and hours, or something about the posting itself?": "क्या यह कार्यभार और समय को लेकर है, या पोस्टिंग के बारे में कुछ है?",
  "Has this been building up gradually, or did something recently make it worse?": "क्या यह धीरे-धीरे बढ़ रहा था, या हाल ही में किसी बात से बढ़ा?",
  "Are your scheduled rest days actually happening, or getting missed often?": "क्या आपको निर्धारित विश्राम दिवस मिल रहे हैं, या अक्सर छूट जाते हैं?",
  "How's your sleep been through this stretch?": "इस दौरान आपकी नींद कैसी रही है?",
  "Is this something you feel mostly when you're alone with it, or does it show around the rest of your section too?": "क्या आप इसे अकेले में अधिक महसूस करते हैं, या आपके सेक्शन के बाकी लोगों को भी दिखता है?",
  "Is there someone nearby you'd feel okay mentioning this to, even informally?": "क्या आसपास कोई ऐसा साथी है जिससे आप अनौपचारिक रूप से भी यह बात साझा कर सकें?",
  "Would it help if your section commander knew, informally — or would you rather keep this to yourself for now?": "क्या सेक्शन कमांडर को अनौपचारिक रूप से पता चलना मददगार होगा — या आप इसे अभी अपने तक रखना चाहेंगे?",
  "Anything else you'd want to note, or shall we leave it here for now?": "क्या आप कुछ और लिखना चाहते हैं, या चेक-इन यहीं समाप्त करें?",
  "Is it more just missing them, or something specific going on back home?": "क्या यह केवल उनकी याद आना है, या घर पर कोई विशेष बात चल रही है?",
  "Is it more about your spouse or kids, or the wider family?": "क्या यह अधिक पति/पत्नी या बच्चों के बारे में है, या बड़े परिवार के बारे में?",
  "Do they have people around them to lean on while you're away, or are they mostly managing alone?": "आपकी अनुपस्थिति में क्या उनके पास सहारा देने वाले लोग हैं, या वे अकेले ही संभाल रहे हैं?",
  "How often are you actually able to talk to them?": "आप वास्तव में उनसे कितनी बार बात कर पाते हैं?",
  "Is it a specific worry, or more the general weight of being away?": "क्या यह कोई विशिष्ट चिंता है, या दूर रहने का सामान्य बोझ?",
  "Would it help if the unit's family welfare contact quietly checked in with them?": "क्या यह मददगार होगा यदि यूनिट का परिवार कल्याण संपर्क उनसे सामान्य रूप से कुशलक्षेम पूछे?",
  "Is your next leave coming up soon, or still a while off?": "क्या आपकी अगली छुट्टी जल्द आने वाली है, या अभी काफी समय है?",
  "Anything else to note, or shall we leave it here?": "क्या कुछ और दर्ज करना चाहते हैं, या यहीं समाप्त करें?",
  "Is it mostly sleep, or how you're feeling physically?": "क्या यह मुख्य रूप से नींद की समस्या है, या शारीरिक रूप से कैसा महसूस कर रहे हैं?",
  "Roughly how many nights this past week would you say you slept properly?": "इस पिछले सप्ताह में लगभग कितनी रातें आप ठीक से सो पाए?",
  "Is something specific keeping you up, or does it just not come easily?": "क्या कोई खास बात आपको जगाए रखती है, या नींद आसानी से नहीं आती?",
  "Any physical symptoms lately — headaches, appetite change, low energy?": "क्या हाल ही में कोई शारीरिक लक्षण महसूस हुए — सिरदर्द, भूख में बदलाव, कम ऊर्जा?",
  "Have you mentioned this at a medical camp yet?": "क्या आपने मेडिकल कैंप में डॉक्टर को इसके बारे में बताया है?",
  "Would a reminder ahead of your next camp check-in be useful?": "क्या आपके अगले कैंप चेक-इन से पहले एक रिमाइंडर उपयोगी रहेगा?",
  "Is this fairly new, or has it been going on a while?": "क्या यह हाल ही में शुरू हुआ है, या काफी समय से चल रहा है?",
  "Anything else on this, or shall we leave it here?": "क्या इस संबंध में कुछ और कहना चाहते हैं, या यहीं समाप्त करें?",
  "Would it help to see support options, or are you just noting it for now?": "क्या सहायता विकल्प देखना उपयोगी होगा, या आप केवल अपने लिए नोट कर रहे हैं?",
  "Is it more a one-off expense, or an ongoing worry?": "क्या यह एक बार का खर्च है, या लगातार बनी रहने वाली चिंता?",
  "Is it connected to something back home, or more personal?": "क्या यह घर की किसी बात से जुड़ा है, या अधिक व्यक्तिगत है?",
  "Have you looked into any of the department's existing welfare-fund options?": "क्या आपने विभाग के मौजूदा कल्याण कोष विकल्पों की जानकारी ली है?",
  "Want a private note sent to the welfare cell about available support schemes — no details required from you?": "क्या आप चाहते हैं कि उपलब्ध सहायता योजनाओं के बारे में कल्याण प्रकोष्ठ को एक गोपनीय नोट भेजा जाए — जिसमें आपसे कोई विवरण नहीं माँगा जाएगा?",
  "Is this affecting your sleep or focus on duty at all?": "क्या इससे आपकी नींद या ड्यूटी पर एकाग्रता पर कोई असर पड़ रहा है?",
  "Does this have a rough timeline, or is it ongoing?": "क्या इसके समाधान की कोई समय-सीमा है, या यह अनवरत है?",
  "Do you want to note anything about it, or just flag that something happened?": "क्या आप इसके बारे में कुछ लिखना चाहते हैं, या सिर्फ यह बताना चाहते हैं कि कोई घटना हुई?",
  "This stays private. Only you can choose to share it — nobody else sees this by default.": "यह पूर्णतः गोपनीय रहता है। केवल आप इसे साझा करने का निर्णय ले सकते हैं — स्वतः कोई भी इसे नहीं देख सकता।",

  // Option Labels & Sub-labels
  "Good": "अच्छा",
  "Feeling steady and in rhythm": "स्थिर और सामान्य गति में",
  "Okay": "ठीक-ठाक",
  "Managing, but some things on my mind": "संभाल रहा हूँ, पर कुछ बातें मन में हैं",
  "Tough": "तनावपूर्ण",
  "Things are feeling heavy or strained": "चीजें भारी या तनावपूर्ण लग रही हैं",
  "Rather not say": "कुछ नहीं कहना चाहता",
  "Prefer not to share right now": "अभी साझा नहीं करना चाहता",
  "Prefer not to answer": "उत्तर नहीं देना चाहता",
  "Work / duty pressure": "कार्य / ड्यूटी का दबाव",
  "Roster load, shifts, postings, or incident stress": "रोस्टर लोड, शिफ्ट, पोस्टिंग या ड्यूटी का तनाव",
  "Family": "परिवार",
  "Domestic worries, separation strain, or family health": "घरेलू चिंताएं, दूरी का तनाव या पारिवारिक स्वास्थ्य",
  "Health or sleep": "स्वास्थ्य या नींद",
  "Sleep disruptions, exhaustion, or physical ailments": "नींद में खलल, अत्यधिक थकान या शारीरिक परेशानी",
  "Money": "आर्थिक स्थिति",
  "Financial pressure, expenses, or debt worries": "वित्तीय दबाव, खर्च या ऋण की चिंता",
  "Something from an operation or patrol": "ऑपरेशन या गश्त से संबंधित कोई बात",
  "Encounter, tactical ambush, or traumatic field incident": "मुठभेड़, सामरिक घात या फील्ड की कोई घटना",
  "Something else": "कुछ और बात",
  "Personal reflection or private thoughts": "व्यक्तिगत विचार या निजी बातें",
  "Nothing": "कुछ नहीं",
  "All good out here, thank you": "यहाँ सब ठीक है, धन्यवाद",
  "Something small": "कोई छोटी बात",
  "A minor thought on my mind": "मन में बस एक सामान्य बात है",
  "Workload / hours": "कार्यभार / कार्य के घंटे",
  "Shift lengths, night watches, and turnarounds": "लंबी शिफ्ट, रात्रि ड्यूटी और कम आराम",
  "The posting or location": "पोस्टिंग या स्थान",
  "Outpost isolation, terrain, or climate": "चौकी का अकेलापन, कठिन इलाका या मौसम",
  "A specific incident": "कोई विशेष घटना",
  "A particular operational or duty event": "कोई विशेष ऑपरेशन या ड्यूटी संबंधी घटना",
  "Gradual": "धीरे-धीरे",
  "Cumulative fatigue over weeks or months": "हफ्तों या महीनों से जमा थकान",
  "Something recent": "हाल की कोई बात",
  "A recent change or roster trigger": "रोस्टर में हालिया बदलाव या घटना",
  "Happening": "नियमित मिल रहा है",
  "Getting standard weekly rest": "साप्ताहिक विश्राम सामान्य रूप से मिल रहा है",
  "Often missed": "अक्सर छूट जाता है",
  "Cancelled or postponed frequently": "अक्सर रद्द या स्थगित हो जाता है",
  "Fine": "ठीक है",
  "Able to get enough restful sleep": "पर्याप्त और आरामदायक नींद मिल रही है",
  "Disturbed": "बाधित",
  "Broken sleep, waking up tired": "टूटी-फूटी नींद, जागने पर थकान",
  "Barely sleeping": "ना के बराबर नींद",
  "Severe insomnia or distress": "गंभीर अनिद्रा या बेचैनी",
  "Mostly alone": "अधिकतर अकेले में",
  "Internalized when off duty or at night": "ड्यूटी के बाद या रात में मन में रहना",
  "Shows around others too": "दूसरों को भी दिखता है",
  "Affecting patience, communication, or barracks mood": "धैर्य, बातचीत या व्यवहार पर असर पड़ना",
  "Yes": "हाँ",
  "A buddy, saathi, or colleague in the unit": "यूनिट में कोई बडी, साथी या सहयोगी",
  "Not really": "नहीं",
  "Prefer not to bring it up locally": "यहाँ किसी से साझा नहीं करना चाहता",
  "Let them know": "उन्हें बता सकते हैं",
  "Quiet word to adjust pacing if possible": "कार्यभार में थोड़ा सामंजस्य बैठाने हेतु",
  "Keep it to myself": "अपने तक ही रखना है",
  "Keep strictly off-record for now": "फिलहाल पूरी तरह गोपनीय रखें",
  "Add a private note": "निजी नोट जोड़ें",
  "Write optional reflection in your personal sandbox": "अपने निजी स्पेस में विचार लिखें",
  "Leave it here": "यहीं समाप्त करें",
  "Complete check-in now": "चेक-इन अभी पूर्ण करें",
  "Just missing them": "बस उनकी याद आ रही है",
  "Standard separation weight": "परिवार से दूर रहने का स्वाभाविक भाव",
  "Something specific": "कोई खास बात है",
  "Health, legal, property, or children matters": "स्वास्थ्य, कानूनी, संपत्ति या बच्चों से जुड़े मामले",
  "Spouse / kids": "पति/पत्नी / बच्चे",
  "Nuclear household concerns": "तत्काल परिवार की चिंताएं",
  "Wider family": "माता-पिता / परिजन",
  "Parents, siblings, or elders in village": "गाँव में माता-पिता, भाई-बहन या बुजुर्ग",
  "People around them": "आसपास लोग हैं",
  "Joint family or relatives nearby": "संयुक्त परिवार या नजदीकी रिश्तेदार",
  "Managing household and emergencies independently": "घर और आपात स्थिति अकेले संभालते हैं",
  "Often": "अक्सर",
  "Daily or almost daily calls": "प्रतिदिन या लगभग प्रतिदिन बात होती है",
  "Not as much as I'd like": "जितना चाहता हूँ उतना नहीं",
  "Network issues or duty clash": "नेटवर्क समस्या या ड्यूटी का समय",
  "Rarely": "बहुत कम",
  "Infrequent or strained contact": "बहुत कम या तनावपूर्ण संपर्क",
  "A specific worry": "कोई विशिष्ट चिंता",
  "An acute situation or date deadline": "कोई गंभीर स्थिति या जरूरी तारीख",
  "General weight": "सामान्य खिंचाव",
  "Cumulative separation from milestones": "परिवार के महत्वपूर्ण पलों से दूर रहने का भाव",
  "Yes, please": "हाँ, कृपया",
  "Request quiet family cell outreach": "परिवार कल्याण प्रकोष्ठ से सामान्य संपर्क का अनुरोध",
  "No, not needed": "नहीं, आवश्यकता नहीं है",
  "Prefer to handle privately": "व्यक्तिगत रूप से संभालना चाहता हूँ",
  "Coming up soon": "जल्द आने वाली है",
  "Within the next 2-4 weeks": "अगले 2-4 सप्ताह के भीतर",
  "A while off": "अभी समय है",
  "Several months away": "कुछ महीने दूर",
  "Not sure": "निश्चित नहीं है",
  "Awaiting roster approval": "रोस्टर स्वीकृति की प्रतीक्षा में",
  "Add a note": "नोट जोड़ें",
  "Write reflection for your own log": "अपने निजी लॉग हेतु विचार लिखें",
  "Sleep": "नींद",
  "Trouble falling asleep or staying asleep": "सोने में परेशानी या नींद टूटना",
  "Physical health": "शारीरिक स्वास्थ्य",
  "Aches, joint pain, digestion, or fatigue": "दर्द, जोड़ों में दर्द, पाचन या थकान",
  "Both": "दोनों",
  "Physical wear combined with sleep strain": "शारीरिक थकान और नींद का तनाव दोनों",
  "Most nights": "अधिकांश रातें",
  "5-7 restful nights": "5-7 रातें आरामदायक नींद",
  "Some nights": "कुछ रातें",
  "3-4 nights with broken rest": "3-4 रातें टूटी नींद",
  "Barely any": "ना के बराबर",
  "Severe sleep debt (0-2 nights)": "अत्यधिक नींद की कमी (0-2 रातें)",
  "Thoughts, noise, weather, or phone alerts": "विचार, शोर, मौसम या फोन की आवाज",
  "Just doesn't come easily": "आसानी से नींद नहीं आती",
  "Restless mind or body rhythm": "अशांत मन या शारीरिक चक्र",
  "No major physical symptoms": "कोई बड़ा शारीरिक लक्षण नहीं",
  "Yes, some": "हाँ, कुछ लक्षण",
  "Noticed physical changes or low energy": "शारीरिक बदलाव या ऊर्जा में कमी महसूस हुई",
  "Discussed with medical officer": "चिकित्सा अधिकारी से चर्चा की है",
  "Not yet": "अभी तक नहीं",
  "Haven't brought it up yet": "अभी तक नहीं बताया",
  "Flag a quiet reminder on my dashboard": "डैशबोर्ड पर एक शांत रिमाइंडर दिखाएं",
  "Not needed": "आवश्यकता नहीं है",
  "I know my schedule": "मुझे अपना कार्यक्रम पता है",
  "Fairly new": "हाल ही में शुरू हुआ",
  "Started in the past couple of weeks": "पिछले एक-दो हफ्तों में शुरू हुआ",
  "A while": "काफी समय से",
  "Ongoing for a month or longer": "एक महीने या उससे अधिक समय से जारी",
  "Record private health notes": "निजी स्वास्थ्य नोट दर्ज करें",
  "Show me options": "विकल्प दिखाएं",
  "Welfare loans and emergency relief": "कल्याण ऋण एवं आपातकालीन सहायता",
  "Just noting it": "केवल नोट कर रहा हूँ",
  "Just logging thoughts for myself": "केवल अपने विचारों को दर्ज कर रहा हूँ",
  "One-off": "एक बार का खर्च",
  "Medical emergency, house repair, or travel": "चिकित्सा आपात स्थिति, घर की मरम्मत या यात्रा",
  "Ongoing": "लगातार चिंता",
  "Loans, family commitments, or recurring strain": "ऋण, पारिवारिक जिम्मेदारियां या नियमित खर्च",
  "Connected to family": "परिवार से जुड़ा",
  "Village expenses, medical needs, or marriage": "गाँव के खर्च, चिकित्सा आवश्यकताएं या विवाह",
  "More personal": "अधिक व्यक्तिगत",
  "Personal debt or unexpected cost": "व्यक्तिगत देनदारी या अप्रत्याशित खर्च",
  "Aware or already applied": "जानकारी है या आवेदन किया है",
  "Haven't looked into it": "अभी तक जानकारी नहीं ली",
  "Didn't know these existed": "मुझे इसकी जानकारी नहीं थी",
  "Unaware of welfare grant provisions": "कल्याण अनुदान प्रावधानों से अनभिज्ञ",
  "Share available scheme details on my desk": "मेरी डेस्क पर उपलब्ध योजनाओं का विवरण साझा करें",
  "No": "नहीं",
  "I will handle it myself": "मैं स्वयं देख लूँगा",
  "A little": "थोड़ा बहुत",
  "Occasional worry during watches": "ड्यूटी के दौरान कभी-कभार चिंता",
  "Duty focus is unaffected": "ड्यूटी पर कोई असर नहीं",
  "Has a timeline": "समय-सीमा है",
  "Will settle in coming weeks / months": "आने वाले हफ्तों या महीनों में सुलझ जाएगा",
  "Long-term commitment": "दीर्घकालिक जिम्मेदारी",
  "Private reflection note": "निजी विचार नोट",
  "Free text note (optional)": "विवरण लिखें (वैकल्पिक)",
  "Just flag that something happened": "केवल बताना चाहते हैं कि घटना हुई",
  "A tough patrol or tactical incident": "कठिन गश्त या सामरिक घटना",
  "Prefer not to detail it": "विस्तार में नहीं जाना चाहता",

  // Context tags & Messages
  "It sounds like things are genuinely hard right now. You don't have to carry this alone.": "लगता है कि इस समय परिस्थितियां वाकई कठिन हैं। आपको इसका बोझ अकेले उठाने की आवश्यकता नहीं है।",
  "Understood — no pressure. I'm here whenever you want to talk.": "समझ गया — कोई दबाव नहीं है। जब भी आप बात करना चाहें, साथी यहीं उपस्थित है।",
  "Glad things are going well. Take care of yourself out there.": "यह जानकर खुशी हुई कि सब ठीक है। अपना ध्यान रखें।",
  "Your private notes have been safely recorded in your personal device sandbox.": "आपके निजी विचार आपके डिवाइस में सुरक्षित रूप से दर्ज कर लिए गए हैं।",
  "Thank you for reflecting with Saathi today. Your check-in is complete.": "आज साथी के साथ विचार साझा करने हेतु धन्यवाद। आपका चेक-इन पूर्ण हो गया है।",

  // Duty Titles
  "Operational LWE & Tactical Patrol Roster": "ऑपरेशनल एलडब्ल्यूई एवं सामरिक गश्त रोस्टर",
  "Operational LWE Patrol Roster": "ऑपरेशनल एलडब्ल्यूई गश्त रोस्टर",
  "Border Outpost Guard & Surveillance Roster": "सीमा चौकी सुरक्षा एवं निगरानी रोस्टर",
  "VVIP / Static Duty & High-Transit Security Roster": "वीवीआईपी / स्थायी ड्यूटी एवं सुरक्षा रोस्टर",
  "Administrative & Supervisory Staff Roster": "प्रशासनिक एवं पर्यवेक्षी स्टाफ रोस्टर",
  "Peace Station / Training Center Daily Routine": "शांत स्टेशन / प्रशिक्षण केंद्र दैनिक दिनचर्या",

  // Domain tags
  "work": "कार्य / ड्यूटी",
  "family": "परिवार",
  "health": "स्वास्थ्य / नींद",
  "money": "आर्थिक स्थिति",
  "operation": "ऑपरेशन / गश्त",
  "other": "अन्य विचार",
  "Work": "कार्य / ड्यूटी",
  "Health": "स्वास्थ्य / नींद",
  "Operation": "ऑपरेशन / गश्त",
  "Other": "अन्य विचार",
  "saved_note": "निजी नोट सहेजा गया",
  "Private Note Saved": "निजी नोट सहेजा गया",
  "Go straight to safety net": "सीधे सुरक्षा संबल पर जाएं"
};

/**
 * Fast, offline, static string translation lookup for Saathi questions and options.
 */
export function tSaathi(englishText?: string | null, lang?: "en" | "hi"): string {
  if (!englishText) return "";
  if (lang !== "hi") return englishText;
  const trimmed = englishText.trim();
  if (saathiTranslations[trimmed]) return saathiTranslations[trimmed];
  if (saathiTranslations[englishText]) return saathiTranslations[englishText];

  // Dynamic check for returning user opener: "Last time, ... was on your mind. How's that now?"
  const returningMatch = trimmed.match(/^Last time,\s*(.+?)\s*was on your mind\.\s*How's that now\?$/i);
  if (returningMatch) {
    const topic = returningMatch[1].trim();
    const hiTopic = saathiTranslations[topic] || topic;
    return `पिछली बार आपके मन में ${hiTopic} का विषय था। अब यह कैसा है?`;
  }

  return englishText;
}
