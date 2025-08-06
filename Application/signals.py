from .models import *
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Genre)
def ensure_featured_sections_for_genre(sender, instance, **kwargs):
    """
    Automatically creates default 'Popular' and 'Latest' Featured sections for a Genre.

    Trigger:
    - Runs after a Genre is saved (created or updated).

    Behavior:
    - Checks if the 'popular' and 'latest' sections exist for the genre page.
    - If missing, it creates them with the next available order index.
    - Helps ensure consistent layout across all genre pages.

    Notes:
    - Does not duplicate existing sections.
    - Order values are incremented based on current max within the genre scope.
    """

    PAGE_TYPES_TO_CREATE = ['popular', 'latest']

    # Loop through required featured types
    for ftype in PAGE_TYPES_TO_CREATE:
        # Check if a section already exists for this genre and type
        existing = Featured.objects.filter(
            featured_type=ftype,
            page_type='genre',
            genre=instance
        ).first()

        if not existing:
            # Determine next available order number for this genre page
            max_order = Featured.objects.filter(
                page_type='genre',
                genre=instance
            ).aggregate(models.Max('order'))['order__max'] or 0
            
            # Create new featured section with appropriate order
            Featured.objects.create(
                title=ftype.title(),
                featured_type=ftype,
                page_type='genre',
                genre=instance,
                order=max_order + 1
            )