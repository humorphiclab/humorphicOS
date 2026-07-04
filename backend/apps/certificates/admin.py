from django.contrib import admin

from .models import Certificate, CertificateTemplate

admin.site.register(CertificateTemplate)
admin.site.register(Certificate)
