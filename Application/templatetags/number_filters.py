from django import template

register = template.Library()

@register.filter
def shorten_number(value):
    """
    Shortens large numbers into a more readable format with suffixes.
    """
    try:
        value = int(value)
    except (ValueError, TypeError):
        return value

    if value >= 1000000000:
        return f"{value/1000000000:.1f}B"
    elif value >= 1000000:
        return f"{value/1000000:.1f}M"
    elif value >= 1000:
        return f"{value/1000:.1f}K"
    else:
        return str(value)