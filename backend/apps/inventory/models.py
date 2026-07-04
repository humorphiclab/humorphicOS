from django.conf import settings
from django.db import models


class Component(models.Model):
    class Category(models.TextChoices):
        SENSOR = "sensor", "Sensor"
        ACTUATOR = "actuator", "Actuator"
        CONTROLLER = "controller", "Controller"
        POWER = "power", "Power"
        MECHANICAL = "mechanical", "Mechanical"
        ELECTRONIC = "electronic", "Electronic"
        TOOL = "tool", "Tool"
        OTHER = "other", "Other"

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=0)
    min_stock = models.PositiveIntegerField(default=1)
    location = models.CharField(max_length=200, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    supplier = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    @property
    def is_low_stock(self):
        return self.quantity <= self.min_stock

    def __str__(self):
        return f"{self.name} ({self.sku})"


class Equipment(models.Model):
    name = models.CharField(max_length=200)
    serial_number = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("available", "Available"), ("in_use", "In Use"), ("maintenance", "Maintenance"), ("retired", "Retired")],
        default="available",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_equipment"
    )
    purchase_date = models.DateField(null=True, blank=True)
    last_maintenance = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class LabBooking(models.Model):
    lab_name = models.CharField(max_length=200)
    booked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lab_bookings")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    purpose = models.TextField(blank=True)
    equipment = models.ManyToManyField(Equipment, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("approved", "Approved"), ("cancelled", "Cancelled")],
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.lab_name} - {self.booked_by}"


class MaintenanceRecord(models.Model):
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="maintenance_records")
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    performed_by = models.CharField(max_length=200, blank=True)
    performed_at = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Maintenance: {self.equipment.name}"
