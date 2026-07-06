from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from .models import Team
from apps.chat.models import Channel


@receiver(post_save, sender=Team)
def create_team_channel(sender, instance, created, **kwargs):
    if created:
        Channel.objects.create(
            name=f"{instance.name} Team",
            slug=f"team-{instance.slug}",
            description=f"Discussion for the {instance.name} team.",
            team=instance,
        )


@receiver(m2m_changed, sender=Team.members.through)
def update_team_channel_members(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"]:
        # Find the default channel for this team
        channel = Channel.objects.filter(team=instance).first()
        if channel and pk_set:
            if action == "post_add":
                channel.members.add(*pk_set)
            elif action == "post_remove":
                channel.members.remove(*pk_set)
