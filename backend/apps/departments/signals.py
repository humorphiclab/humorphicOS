from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from .models import Department
from apps.chat.models import Channel


@receiver(post_save, sender=Department)
def create_department_channel(sender, instance, created, **kwargs):
    if created:
        Channel.objects.create(
            name=f"{instance.name} General",
            slug=f"dept-{instance.slug}-general",
            description=f"General discussion for {instance.name} department.",
            department=instance,
        )


@receiver(m2m_changed, sender=Department.members.through)
def update_department_channel_members(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"]:
        # Find the default channel for this department
        channel = Channel.objects.filter(department=instance).first()
        if channel and pk_set:
            if action == "post_add":
                channel.members.add(*pk_set)
            elif action == "post_remove":
                channel.members.remove(*pk_set)
