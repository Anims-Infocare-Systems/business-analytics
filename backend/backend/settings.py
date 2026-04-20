from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-zj%!nwe5_$pw+q0=ngelf(-ce+2t%s55f!iek@#il+)^xddykb'

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]


# ─── Applications ─────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',        # ✅ required for session-based auth
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',                    # ✅ must be in INSTALLED_APPS
    'accounts',
]


# ─── Middleware ───────────────────────────────────────────────
# ⚠️  CorsMiddleware MUST be first — before SessionMiddleware
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',              # ✅ FIRST — was last before
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',          # ✅ only once — was duplicated
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# ─── Database (Master DB — Tenant table lives here) ───────────
DATABASES = {
    'default': {
        'ENGINE': 'mssql',
        'NAME':     os.environ.get("DB_NAME",     "SASSMMS"),
        'USER':     os.environ.get("DB_USER",     "sa6"),
        'PASSWORD': os.environ.get("DB_PASSWORD", "Anims!@#2026"),
        'HOST':     os.environ.get("DB_HOST",     "P3NWPLSK12SQL-v02.shr.prod.phx3.secureserver.net"),
        'PORT':     os.environ.get("DB_PORT",     "1433"),
        'OPTIONS': {
            'driver':               'ODBC Driver 17 for SQL Server',
            'encrypt':              True,
            'trustServerCertificate': True,
        },
    }
}


# ─── CORS ─────────────────────────────────────────────────────
# ⚠️  CORS_ALLOW_ALL_ORIGINS = True is INCOMPATIBLE with
#     CORS_ALLOW_CREDENTIALS = True — browsers reject this combo.
#     Must use explicit origin list instead.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",      # ✅ Vite default port — THIS WAS MISSING
    "http://127.0.0.1:5173",     # ✅ Vite alternate
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True     # ✅ allows session cookie cross-origin

CORS_ALLOW_HEADERS = [            # ✅ allow Content-Type for JSON POST
    "content-type",
    "accept",
    "authorization",
    "x-csrftoken",
    "x-requested-with",
]


# ─── Session ──────────────────────────────────────────────────
SESSION_ENGINE          = "django.contrib.sessions.backends.db"
SESSION_COOKIE_SAMESITE = "Lax"   # ✅ allows cookie across ports on localhost
SESSION_COOKIE_SECURE   = False   # ✅ False for HTTP localhost (no HTTPS needed)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE      = 86400   # ✅ session lives 24 hours (in seconds)


# ─── CSRF ─────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",      # ✅ add this too
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ─── Password validation ──────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─── Internationalisation ──────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Asia/Kolkata'    # ✅ changed from UTC — matches your FY logic
USE_I18N      = True
USE_TZ        = True


# ─── Static files ─────────────────────────────────────────────
STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'