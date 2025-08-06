from django.contrib import admin
from django.db.models import Value, IntegerField, Case, When
from django.db.models.functions import Coalesce
from .models import *
from .forms import *

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    """
    Admin interface for managing Book models.
    Handles display, filtering, and custom methods for book management.
    
    Features:
    - Displays key book fields in list view
    - Filters books by publication date
    - Shows related genres as clickable admin links
    
    Error Handling:
    - Missing genre relations are handled gracefully (returns empty list).
    - Django admin handles blank or None values safely by default.
    """
    list_display = ('title', 'author', 'ISBN', 'date_published', 'available_quantity', 'total_quantity', 'genres_list')
    # Sidebar filter for date_published
    list_filter = ['date_published']
    
    # Custom method to show related genres as clickable links, returns empty string if no genres
    def genres_list(self, obj):
        genres = obj.genres.all()
        links = []
        for genre in genres:
            # Generate admin URL for each genre's change page
            url = reverse('admin:Application_genre_change', args=[genre.id])
            links.append(f'<a href="{url}">{genre.name}</a>')
        return format_html(", ".join(links))

    # Set column name in admin interface
    genres_list.short_description = "Genres"



@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    """
    Admin interface for managing Genre models.

    Features:
    - Displays genre name with a list of associated books.
    - Each book title is a clickable link to its admin edit page.

    Error Handling:
    - Gracefully handles genres with no related books (displays blank).
    """
    # Display genre name and related books
    list_display = ('name', 'book_list')
    
    # Custom method to show related books as clickable links
    def book_list(self, obj):
        books = obj.books.all()
        links = []
        for book in books:
            url = reverse('admin:Application_book_change', args=[book.id])
            links.append(f'<a href="{url}">{book.title}</a>')
        return format_html(", ".join(links))

    # Set column name in admin interface
    book_list.short_description = "Books"



@admin.register(BorrowRecord)
class RecordsAdmin(admin.ModelAdmin):
    """
    Admin interface for managing BorrowRecord objects.

    Features:
    - Displays user, book, and relevant dates (borrow, due, return).
    - Allows sorting by ID for easy tracking.

    Error Handling:
    - Django admin handles blank or missing fields automatically.
    """
    list_display = ('id', 'user', 'book', 'borrow_date', 'due_date', 'return_date')



@admin.register(Featured)
class FeaturedAdmin(admin.ModelAdmin):
    """
    Admin interface for managing Featured content blocks.

    Features:
    - Uses a custom admin form (FeaturedAdminForm) for validation.
    - Supports inline editing of the 'order' field.
    - Provides filtering by page type, genre, and featured type.
    - Implements custom queryset sorting logic based on page priority and genre name.

    Sorting Logic:
    1. Page type priority (Home > Library > Genre)
    2. Genre name (only if page_type is 'genre')
    3. Manual 'order' field for finer control.

    Error Handling:
    - Coalesce ensures null genre names don't break sorting.
    - Default values in Case expressions ensure robustness against unexpected input.
    """
    form = FeaturedAdminForm
    # Display key fields in the admin list
    list_display = ('title', 'featured_type', 'page_type', 'genre', 'order')
    # Allow inline editing of the 'order' field
    list_editable = ['order']
    # Add filters in the admin sidebar
    list_filter = ['page_type', 'genre', 'featured_type']
    
    # Override the queryset to support custom ordering logic
    def get_queryset(self, request):
        qs = super().get_queryset(request)

        # Annotate custom sorting values based on page type and genre
        qs = qs.annotate(
            genre_name_order=Case(
                When(page_type='genre', then=Coalesce('genre__name', Value(''))),
                default=Value(''),  # Don't sort by genre for home/library
                output_field=models.CharField()
            ),
            page_type_order=Case(
                When(page_type='home', then=Value(0)),
                When(page_type='library', then=Value(1)),
                When(page_type='genre', then=Value(2)),
                default=Value(99),  # Catch-all for unexpected types
                output_field=IntegerField()
            )
        )

        # Sort Featured items by: page type priority, genre name (if applicable), and custom order field
        return qs.order_by(
            'page_type_order',
            'genre_name_order',
            'order'
        )