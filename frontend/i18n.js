/* =========================================================
   SMART LIVESTOCK - INTERNATIONALIZATION
   English / Hindi / Marathi
   ========================================================= */

const SOURCE_TEXT = {
    subtitle:'Health Monitoring & Early Warning System',
    name:'Enter your name',
    choose:'Choose Language',

    farmer:'Continue as Farmer',
    vet:'Continue as Veterinarian',
    gov:'Continue as Government',

    title:'Smart Livestock',
    farmerDash:'Farmer Dashboard',
    vetDash:'Veterinarian Dashboard',
    govDash:'Government / Animal Husbandry Dashboard',

    myAnimals:'My Animals',
    highRisk:'High Risk',
    vaccinationDue:'Vaccination Due',
    highRiskCases:'High Risk Cases',
    mediumRisk:'Medium Risk',
    lowRisk:'Low Risk',
    affectedAreas:'Affected Areas',
    totalReports:'Total Reports',

    diseaseMonitoring:'Disease Spread Monitoring',
    map:'Area-wise monitoring map',

    register:'Register Animal',
    report:'Report Symptoms',
    records:'Health Records',
    vaccination:'Vaccination',
    alerts:'Alerts',
    trends:'Disease Trends',
    programs:'Vaccination Programs',

    save:'Save Animal',
    submit:'Submit & Analyze',
    logout:'Logout',

    location:'Location',
    mic:'Microphone',
    speaker:'Speaker',

    registerAnimal:'Register New Animal',
    animalId:'Animal ID (e.g. A001)',
    species:'Select Species',
    age:'Age in years',

    genderMale:'Male',
    genderFemale:'Female',

    vaccinationHistory:'Vaccination history',
    medicalHistory:'Medical history',

    fever:'Fever',
    appetite:'Loss of appetite',
    skin:'Skin problem',
    cough:'Cough',
    weakness:'Weakness',
    milk:'Reduced milk production',

    photo:'Photo URL (optional)',
    photoUpload:'Animal Photo',
    photoHelp:'Choose a photo from gallery or take a new photo with camera',
    gallery:'Choose Photo',
    camera:'Take Photo',

    healthResult:'Health Analysis Result',
    possible:'Possible risks:',
    recommendation:'Recommendation:',

    noRecords:'No records yet. Register an animal first.',
    animals:'Animals',
    reports:'Health Reports',

    breedingTitle:'Breeding Management',
    saveBreeding:'Save Breeding Record',

    vaccinationLabel:'Vaccination:',
    notAdded:'Not added',

    symptoms:'Symptoms:',
    noAlerts:'No alerts yet.',

    fmd:'💉 FMD Vaccine',
    hs:'💉 HS Vaccine',
    bq:'💉 BQ Vaccine',

    due:'Due soon',
    upcoming:'Upcoming',
    scheduled:'Scheduled',

    locationFound:'Location found',
    locationDenied:'Unable to get your location. Please allow location permission.',
    locationUnsupported:'Location is not supported by this browser.',

    micUnsupported:'Microphone voice input is not supported by this browser.',
    micListening:'Listening… speak now',
    micStopped:'Microphone stopped',
    micNoSpeech:'No speech detected. Please try again.',

    speakerUnsupported:'Speaker is not supported by this browser.',
    speakerNoText:'Please analyze a case first.',

    registered:'Animal registered successfully!',

    welcome:'Welcome',
    getStarted:'Get started',
    selectRole:'Select your language and choose your role',
    yourName:'Your name',
    chooseRole:'Choose your role',

    healthPoint:'Health Monitoring',
    healthPointSmall:'Track livestock health easily',

    warningPoint:'Early Warning',
    warningPointSmall:'Identify risks before they grow',

    managementPoint:'Smart Management',
    managementPointSmall:'Make better farming decisions',

    status:'Smart & Connected Livestock Care',

    farmerSmall:'Manage animals & health',
    vetSmall:'Review cases & alerts',
    govSmall:'Monitor trends & areas',

    footer:'Smart & Connected Livestock Care',

    years:'years',
    riskLevel:'Risk Level',

    skinRisk:'Skin-related infection risk',
    systemicRisk:'Systemic illness risk',
    respiratoryRisk:'Respiratory illness risk',
    generalConcern:'General health concern',

    highRecommendation:'Contact a veterinarian promptly and isolate the animal if advised by the veterinarian.',
    mediumRecommendation:'Monitor the animal closely and consider veterinary consultation.',
    lowRecommendation:'Continue preventive care and monitor for new symptoms.',

    speciesPlaceholder:'Select Species',
    smartAgriculture:'SMART AGRICULTURE',

    cow:'Cow',
    buffalo:'Buffalo',
    goat:'Goat',
    sheep:'Sheep',
    other:'Other',
    otherSpecies:'Enter species name',

    male:'Male',
    female:'Female',

    invalidAnimalPhoto:'Invalid photo. Please upload an animal photo.',
    analyzingPhoto:'AI is checking the photo...',
    animalDetected:'Animal detected',

    photoPrediction:'AI Photo Screening',
    possibleDisease:'Possible disease / condition',
    confidence:'Confidence',

    vetConfirm:'This is a screening result, not a veterinary diagnosis. Please confirm with a veterinarian.',

    speakHere:'Speak Here',
    clearNew:'Clear & Add New',

    contactVet:'Contact Veterinarian',
    contactFarmers:'Contact Farmers',
    contactTitle:'Veterinarian Contact',
    contactPlaceholder:'Type your message',
    sendMessage:'Send Message',

    noMessages:'No messages yet.',
    farmerMessage:'Farmer message',
    vetMessage:'Veterinarian message',
    sent:'Message sent successfully.',

    newCase:'Ready for a new animal health check.',

    breeding:'Breeding',
    treatment:'Treatment',
    offline:'Offline Sync',
    lab:'Lab Referral',
    verify:'Verify Cases',
    management:'Management Statistics',

    animalRequired:'Please enter Animal ID.',

    fillRequired:'Please fill all required fields.',
    duplicateAnimal:'This Animal ID is already registered.',
    animalNotFound:'Animal ID not found. Please register the animal first.',
    selectSymptom:'Please select at least one symptom or upload a photo.'
};


/* =========================================================
   SUPPORTED LANGUAGES
   ========================================================= */

const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'];

let selectedLanguage = 'en';

try {
    const savedLanguage =
        localStorage.getItem('smartLivestockLanguage');

    if (SUPPORTED_LANGUAGES.includes(savedLanguage)) {
        selectedLanguage = savedLanguage;
    }
} catch (error) {
    console.warn('Unable to read saved language.', error);
}


/* =========================================================
   IMPORTANT:
   ALWAYS USE DEPLOYED BACKEND WHEN WEBSITE IS ONLINE
   ========================================================= */

const DEPLOYED_API_BASE =
    'https://livestock-new-v7ca.onrender.com';

function getTranslationApiBase() {

    const host = window.location.hostname;

    const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1';

    /*
      Local website:
      use localhost backend.

      Render website:
      ALWAYS use Render backend.

      This prevents an old localStorage value such as
      http://localhost:5000 from breaking translation.
    */

    if (isLocal) {

        const saved =
            localStorage.getItem('smartLivestockApiBase');

        if (
            saved &&
            /^https?:\/\//i.test(saved)
        ) {
            return saved.replace(/\/+$/, '');
        }

        return 'http://localhost:5000';
    }

    return DEPLOYED_API_BASE;
}

const TRANSLATE_API_BASE = getTranslationApiBase;


/* =========================================================
   TRANSLATION CACHE
   ========================================================= */

const API_CACHE_KEY =
    'smartLivestockApiTranslations_v3';

const API_CACHE_MAX = 4000;
const API_BATCH = 25;

let _apiCache = {};

try {

    _apiCache =
        JSON.parse(
            localStorage.getItem(API_CACHE_KEY) || '{}'
        ) || {};

} catch (error) {

    _apiCache = {};
}


const _apiQueue = new Set();
const _apiInflight = new Set();

let _apiTimer = null;
let _apiFailedUntil = 0;


/* =========================================================
   HELPERS
   ========================================================= */

const LEAD =
    /^([^\p{L}\p{N}]*)([\s\S]*)$/u;


function _needsApi(body) {

    if (!body) return false;

    if (body.length < 2) return false;

    if (body.length > 500) return false;

    if (
        !/[A-Za-z]{3,}/.test(
            body.replace(
                /\b[A-Z0-9]{2,5}\b/g,
                ''
            )
        )
    ) {
        return false;
    }

    if (
        !/\s/.test(body) &&
        (
            /\d/.test(body) ||
            /^[A-Z]{2,5}$/.test(body)
        )
    ) {
        return false;
    }

    if (/^https?:|@/.test(body)) {
        return false;
    }

    return true;
}


/* =========================================================
   TRANSLATION CORE
   ========================================================= */

function _translateCore(core, lang) {

    const match = core.match(LEAD);

    const lead = match ? match[1] : '';

    const original =
        match ? match[2] : core;

    const body =
        original.replace(/\s+$/, '');

    const trail =
        original.slice(body.length);

    if (
        !body ||
        !_needsApi(body)
    ) {
        return {
            text: core,
            pending: false
        };
    }

    const cacheKey =
        lang + '|' + body;

    const cached =
        _apiCache[cacheKey];

    if (cached !== undefined) {

        return {
            text: lead + cached + trail,
            pending: false
        };
    }

    return {
        text: core,
        pending: true,
        body
    };
}


function translateString(
    text,
    lang = selectedLanguage
) {

    if (
        !text ||
        lang === 'en' ||
        !SUPPORTED_LANGUAGES.includes(lang)
    ) {
        return text;
    }

    return _translateCore(
        text,
        lang
    ).text;
}


/* =========================================================
   QUEUE TRANSLATION
   ========================================================= */

function _queueApi(lang, body) {

    const key =
        lang + '|' + body;

    if (
        _apiCache[key] !== undefined ||
        _apiQueue.has(key) ||
        _apiInflight.has(key)
    ) {
        return;
    }

    _apiQueue.add(key);

    clearTimeout(_apiTimer);

    _apiTimer =
        setTimeout(
            flushTranslationQueue,
            100
        );
}


/* =========================================================
   TRANSLATION NOTICE
   ========================================================= */

function _showNotice(show, detail) {

    let notice =
        document.getElementById(
            'i18nNotice'
        );

    if (!show) {

        if (notice) {
            notice.remove();
        }

        return;
    }

    if (!document.body) return;

    if (!notice) {

        notice =
            document.createElement('div');

        notice.id =
            'i18nNotice';

        notice.setAttribute(
            'data-no-i18n',
            ''
        );

        notice.style.cssText =
            `
            position:fixed;
            left:50%;
            bottom:18px;
            transform:translateX(-50%);
            z-index:99999;
            background:#7a1f1f;
            color:#fff;
            padding:10px 16px;
            border-radius:12px;
            font:600 13px/1.4 Arial,sans-serif;
            box-shadow:0 8px 24px #0004;
            max-width:92%;
            text-align:center;
            `;

        document.body.appendChild(notice);
    }

    notice.textContent =
        'Translation failed: ' +
        (
            detail ||
            'Unknown translation error.'
        );
}


/* =========================================================
   BACKEND TRANSLATION REQUEST
   ========================================================= */

async function _translateBatch(
    lang,
    batch
) {

    try {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                30000
            );

        const base =
            TRANSLATE_API_BASE();

        const response =
            await fetch(
                base + '/api/translate',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        texts: batch,

                        /*
                          Support the backend format
                          used by app.js.
                        */
                        targetLanguage: lang,

                        /*
                          Keep compatibility with
                          previous backend code.
                        */
                        target: lang,

                        source: 'en'
                    }),

                    signal: controller.signal
                }
            );

        clearTimeout(timeout);

        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                ('HTTP ' + response.status)
            );
        }


        /*
          Backend may return:

          {
             translations: [...]
          }

          OR:

          {
             translatedTexts: [...]
          }

          Support both.
        */

        const translated =
            Array.isArray(
                data.translations
            )
                ? data.translations
                : Array.isArray(
                    data.translatedTexts
                )
                    ? data.translatedTexts
                    : null;


        if (
            !translated ||
            translated.length !== batch.length
        ) {

            throw new Error(
                'Invalid translation response from backend.'
            );
        }


        batch.forEach(
            (text, index) => {

                const translatedText =
                    translated[index] || text;

                _apiCache[
                    lang + '|' + text
                ] = translatedText;
            }
        );


        _showNotice(false);

        return true;

    } catch (error) {

        const base =
            TRANSLATE_API_BASE();

        let reason;


        if (
            error.name ===
            'AbortError'
        ) {

            reason =
                'Translation server took too long to respond.';

        } else if (
            error instanceof TypeError
        ) {

            reason =
                'Cannot connect to translation backend: ' +
                base;

        } else {

            reason =
                error.message ||
                'Translation failed.';
        }


        console.warn(
            'Translation API failed:',
            reason
        );


        _apiFailedUntil =
            Date.now() + 15000;


        _showNotice(
            true,
            reason
        );


        return false;

    } finally {

        batch.forEach(
            text => {

                const key =
                    lang + '|' + text;

                _apiQueue.delete(key);

                _apiInflight.delete(key);
            }
        );
    }
}


/* =========================================================
   SAVE CACHE
   ========================================================= */

function _persistCache() {

    const keys =
        Object.keys(_apiCache);


    if (
        keys.length >
        API_CACHE_MAX
    ) {

        keys
            .slice(
                0,
                keys.length -
                API_CACHE_MAX
            )
            .forEach(
                key =>
                    delete _apiCache[key]
            );
    }


    try {

        localStorage.setItem(
            API_CACHE_KEY,
            JSON.stringify(_apiCache)
        );

    } catch (error) {

        console.warn(
            'Unable to save translation cache.',
            error
        );
    }
}


/* =========================================================
   FLUSH TRANSLATION QUEUE
   ========================================================= */

async function flushTranslationQueue() {

    if (
        Date.now() <
        _apiFailedUntil
    ) {
        return;
    }


    const items =
        [..._apiQueue]
            .filter(
                key =>
                    !_apiInflight.has(key)
            );


    if (!items.length) {
        return;
    }


    items.forEach(
        key =>
            _apiInflight.add(key)
    );


    if (document.body) {

        document.body.classList.add(
            'i18n-loading'
        );
    }


    const groups = {};


    items.forEach(key => {

        const separator =
            key.indexOf('|');

        const lang =
            key.slice(
                0,
                separator
            );

        const text =
            key.slice(
                separator + 1
            );


        if (!groups[lang]) {
            groups[lang] = [];
        }


        groups[lang].push(text);
    });


    const jobs = [];


    Object.entries(groups)
        .forEach(
            ([lang, texts]) => {

                for (
                    let i = 0;
                    i < texts.length;
                    i += API_BATCH
                ) {

                    jobs.push(
                        _translateBatch(
                            lang,
                            texts.slice(
                                i,
                                i + API_BATCH
                            )
                        )
                    );
                }
            }
        );


    const results =
        await Promise.all(jobs);


    if (
        results.some(
            result => result === true
        )
    ) {

        _persistCache();

        translateVisibleUI();
    }


    if (
        !_apiInflight.size &&
        document.body
    ) {

        document.body.classList.remove(
            'i18n-loading'
        );
    }


    if (
        results.includes(false)
    ) {

        setTimeout(
            () => {

                if (
                    selectedLanguage !==
                    'en'
                ) {

                    translateVisibleUI();
                }
            },
            15500
        );
    }
}


/* =========================================================
   TRANSLATE NOW
   ========================================================= */

async function translateNow(
    texts,
    lang = selectedLanguage
) {

    if (
        !texts ||
        !texts.length ||
        lang === 'en'
    ) {
        return texts;
    }


    const need = [];


    texts.forEach(text => {

        const result =
            _translateCore(
                text,
                lang
            );


        if (
            result.pending &&
            !need.includes(
                result.body
            )
        ) {

            need.push(
                result.body
            );
        }
    });


    for (
        let i = 0;
        i < need.length;
        i += API_BATCH
    ) {

        await _translateBatch(
            lang,
            need.slice(
                i,
                i + API_BATCH
            )
        );
    }


    _persistCache();


    return texts.map(
        text =>
            translateString(
                text,
                lang
            )
    );
}


function translateText(
    text,
    target = selectedLanguage
) {

    return translateNow(
        [text],
        target
    ).then(
        result => result[0]
    );
}


/* =========================================================
   SOURCE TEXT FUNCTION
   ========================================================= */

function t(key) {

    return SOURCE_TEXT[key] ?? '';
}


/* =========================================================
   DOM TRANSLATION
   ========================================================= */

const _textRec =
    new WeakMap();

const _attrRec =
    new WeakMap();


function _sync(
    record,
    current,
    lang
) {

    let rec = record;


    if (
        !rec ||
        (
            current !== rec.out &&
            current !== rec.src
        )
    ) {

        rec = {
            src: current,
            out: current
        };
    }


    const match =
        rec.src.match(
            /^(\s*)([\s\S]*?)(\s*)$/
        );


    const before =
        match[1];

    const core =
        match[2];

    const after =
        match[3];


    if (
        lang === 'en' ||
        !core ||
        !/[A-Za-z]/.test(core)
    ) {

        rec.out =
            rec.src;

        return rec;
    }


    const result =
        _translateCore(
            core,
            lang
        );


    if (result.pending) {

        _queueApi(
            lang,
            result.body
        );
    }


    rec.out =
        before +
        result.text +
        after;


    return rec;
}


const _skipParent =
    element => {

        if (!element) {
            return true;
        }


        if (
            /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|OPTION)$/
                .test(
                    element.tagName
                )
        ) {

            return true;
        }


        return Boolean(
            element.closest(
                '[data-no-i18n]'
            )
        );
    };


const PAGE_TITLE =
    'Smart Livestock | Health Monitoring & Early Warning System';


const PAGE_TAGLINE =
    'SMART LIVESTOCK • INTELLIGENT ANIMAL HEALTH';


function _translatePlain(
    text,
    lang
) {

    const result =
        _translateCore(
            text,
            lang
        );


    if (result.pending) {

        _queueApi(
            lang,
            result.body
        );
    }


    return result.text;
}


/* =========================================================
   TRANSLATE VISIBLE UI
   ========================================================= */

function translateVisibleUI(
    root = document.body
) {

    if (!root) {
        return;
    }


    const lang =
        selectedLanguage;


    try {

        const walker =
            document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT
            );


        const nodes = [];


        while (
            walker.nextNode()
        ) {

            nodes.push(
                walker.currentNode
            );
        }


        nodes.forEach(node => {

            if (
                _skipParent(
                    node.parentElement
                )
            ) {

                return;
            }


            const record =
                _sync(
                    _textRec.get(node),
                    node.nodeValue,
                    lang
                );


            _textRec.set(
                node,
                record
            );


            if (
                node.nodeValue !==
                record.out
            ) {

                node.nodeValue =
                    record.out;
            }
        });


        const scope =
            root.querySelectorAll
                ? root
                : document;


        scope
            .querySelectorAll(
                'option'
            )
            .forEach(option => {

                if (
                    option.closest(
                        '[data-no-i18n]'
                    )
                ) {

                    return;
                }


                const record =
                    _sync(
                        _textRec.get(option),
                        option.textContent,
                        lang
                    );


                _textRec.set(
                    option,
                    record
                );


                if (
                    option.textContent !==
                    record.out
                ) {

                    option.textContent =
                        record.out;
                }
            });


        scope
            .querySelectorAll(
                '[placeholder],[title]'
            )
            .forEach(element => {

                if (
                    element.closest(
                        '[data-no-i18n]'
                    )
                ) {

                    return;
                }


                const store =
                    _attrRec.get(element) ||
                    {};


                ['placeholder', 'title']
                    .forEach(attribute => {

                        if (
                            !element.hasAttribute(
                                attribute
                            )
                        ) {

                            return;
                        }


                        const record =
                            _sync(
                                store[attribute],
                                element.getAttribute(
                                    attribute
                                ),
                                lang
                            );


                        store[attribute] =
                            record;


                        if (
                            element.getAttribute(
                                attribute
                            ) !==
                            record.out
                        ) {

                            element.setAttribute(
                                attribute,
                                record.out
                            );
                        }
                    });


                _attrRec.set(
                    element,
                    store
                );
            });


        /*
          Page title
        */

        document.title =
            lang === 'en'
                ? PAGE_TITLE
                : _translatePlain(
                    PAGE_TITLE,
                    lang
                );


        /*
          CSS tagline
        */

        const html =
            document.documentElement;


        if (lang === 'en') {

            html.style.removeProperty(
                '--tagline'
            );

        } else {

            html.style.setProperty(
                '--tagline',
                JSON.stringify(
                    _translatePlain(
                        PAGE_TAGLINE,
                        lang
                    )
                )
            );
        }

    } catch (error) {

        console.error(
            'Language rendering error:',
            error
        );

    }
}


/* =========================================================
   MUTATION OBSERVER
   ========================================================= */

let _mo = null;
let _obsTimer = null;


function startTranslationObserver() {

    if (
        _mo ||
        !document.body
    ) {

        return;
    }


    _mo =
        new MutationObserver(
            () => {

                clearTimeout(
                    _obsTimer
                );


                _obsTimer =
                    setTimeout(
                        () =>
                            translateVisibleUI(),
                        80
                    );
            }
        );


    _mo.observe(
        document.body,
        {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: [
                'placeholder',
                'title'
            ]
        }
    );
}


/* =========================================================
   ALERT / CONFIRM TRANSLATION
   ========================================================= */

(function patchDialogs() {

    const originalAlert =
        window.alert.bind(window);

    const originalConfirm =
        window.confirm.bind(window);


    window.alert =
        message => {

            const text =
                String(
                    message ?? ''
                );


            if (
                selectedLanguage ===
                'en'
            ) {

                return originalAlert(
                    text
                );
            }


            const result =
                _translateCore(
                    text,
                    selectedLanguage
                );


            if (
                !result.pending
            ) {

                return originalAlert(
                    result.text
                );
            }


            Promise.race([
                translateNow([
                    text
                ]).then(
                    result =>
                        result[0]
                ),

                new Promise(
                    resolve =>
                        setTimeout(
                            () =>
                                resolve(
                                    text
                                ),
                            4000
                        )
                )

            ]).then(
                originalAlert
            );
        };


    window.confirm =
        message => {

            const text =
                String(
                    message ?? ''
                );


            if (
                selectedLanguage ===
                'en'
            ) {

                return originalConfirm(
                    text
                );
            }


            const result =
                _translateCore(
                    text,
                    selectedLanguage
                );


            if (result.pending) {

                _queueApi(
                    selectedLanguage,
                    result.body
                );
            }


            return originalConfirm(
                result.text
            );
        };

})();


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function setText(
    id,
    key
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            t(key);
    }
}


function applyLanguage() {

    translateVisibleUI();
}


/* =========================================================
   SET LANGUAGE
   ========================================================= */

function setLanguage(lang) {

    if (
        !SUPPORTED_LANGUAGES.includes(
            lang
        )
    ) {

        lang = 'en';
    }


    selectedLanguage =
        lang;


    try {

        localStorage.setItem(
            'smartLivestockLanguage',
            selectedLanguage
        );

    } catch (error) {

        console.warn(
            'Unable to save language.',
            error
        );
    }


    document.documentElement.lang =
        selectedLanguage;


    /*
      Keep all language selectors
      synchronized.
    */

    [
        'loginLanguage',
        'languageSelect'
    ].forEach(id => {

        const select =
            document.getElementById(id);


        if (select) {

            select.value =
                selectedLanguage;
        }
    });


    /*
      Allow app.js to refresh
      dynamic content.
    */

    try {

        if (
            window.refreshDynamicLanguage
        ) {

            window.refreshDynamicLanguage();
        }

    } catch (error) {

        console.warn(
            'refreshDynamicLanguage failed:',
            error
        );
    }


    /*
      Refresh dashboard data
      when dashboard is visible.
    */

    const dashboard =
        document.getElementById(
            'dashboard'
        );


    if (
        dashboard &&
        !dashboard.classList.contains(
            'hidden'
        )
    ) {

        try {

            if (window.loadRecords) {

                window.loadRecords();
            }

        } catch (error) {

            console.warn(error);
        }


        try {

            if (window.loadAlerts) {

                window.loadAlerts();
            }

        } catch (error) {

            console.warn(error);
        }
    }


    /*
      English does not need API.
    */

    if (
        selectedLanguage ===
        'en'
    ) {

        _showNotice(false);

    } else {

        /*
          Allow immediate retry after
          user changes language.
        */

        _apiFailedUntil = 0;


        /*
          Queue all application strings.
        */

        Object.values(
            SOURCE_TEXT
        ).forEach(text => {

            const result =
                _translateCore(
                    text,
                    selectedLanguage
                );


            if (
                result.pending
            ) {

                _queueApi(
                    selectedLanguage,
                    result.body
                );
            }
        });
    }


    /*
      Translate current page immediately.
    */

    translateVisibleUI();


    /*
      Translate newly rendered content.
    */

    startTranslationObserver();
}


/* =========================================================
   LANGUAGE SELECT CHANGE
   ========================================================= */

function changeLanguage() {

    const select =
        document.getElementById(
            'languageSelect'
        );


    if (!select) {
        return;
    }


    setLanguage(
        select.value
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeLanguage() {

    try {

        setLanguage(
            selectedLanguage
        );

    } catch (error) {

        console.error(
            'Language initialization failed:',
            error
        );
    }
}


if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        initializeLanguage
    );

} else {

    initializeLanguage();
}


/* =========================================================
   GLOBAL EXPORTS
   ========================================================= */

window.SmartLivestockI18n = {

    setLanguage,
    changeLanguage,
    translateText,
    translateNow,
    translateString,
    translateVisibleUI,
    getSelectedLanguage:
        () => selectedLanguage,

    getSupportedLanguages:
        () => [...SUPPORTED_LANGUAGES],

    getTranslationApiBase:
        TRANSLATE_API_BASE
};


/*
  Keep these functions globally available
  because existing HTML/app.js may call them.
*/

window.setLanguage = setLanguage;
window.changeLanguage = changeLanguage;
window.translateText = translateText;
window.translateNow = translateNow;
window.translateString = translateString;
window.translateVisibleUI = translateVisibleUI;
window.applyLanguage = applyLanguage;
window.t = t;