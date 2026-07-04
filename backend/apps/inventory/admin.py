from django.contrib import admin

from .models import Component, Equipment, LabBooking, MaintenanceRecord

admin.site.register(Component)
admin.site.register(Equipment)
admin.site.register(LabBooking)
admin.site.register(MaintenanceRecord)
