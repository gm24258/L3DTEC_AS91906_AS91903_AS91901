from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator
from django.utils.html import format_html
from django.urls import reverse
from .exceptions import *
from datetime import timedelta

class Genre(models.Model):
    """
    Represents a book genre (e.g., Fiction, Biography).

    Features:
    - Used in many-to-many relations with Book.
    - Helps categorize and filter books.

    Error Handling:
    - Name must be unique.
    """
    name = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return str(self.name)  



def validate_isbn(value):
    """Validates if ISBN contains only numbers and is exactly 13 digits"""
    if len(value) != 13 or not value.isdigit():
        raise ValidationError("ISBN must be exactly 13 digits.")

class Book(models.Model):
    """
    Represents a book with metadata, stock details, and genre tags.

    Features:
    - Stores title, author, ISBN, and genre associations.
    - Tracks inventory and borrow statistics.
    - Auto-fills missing description with default text.

    Error Handling:
    - ISBN must be 13 digits.
    - Available quantity cannot exceed total quantity.
    """
    

    title = models.CharField(max_length=200)
    author = models.CharField(max_length=100)
    ISBN = models.CharField(max_length=13, unique=True, validators=[validate_isbn])
    date_published = models.DateField(default=timezone.now)
    cover = models.ImageField(upload_to="book_covers/", default='book_covers/placeholder_cover.png')
    description = models.TextField(max_length=2500, default='No description available.',blank=True)
    genres = models.ManyToManyField(Genre, related_name="books", blank=True)
    available_quantity = models.PositiveBigIntegerField(default=0)
    total_quantity = models.PositiveBigIntegerField(default=0)
    borrow_count = models.PositiveBigIntegerField(default=0)
    
    def clean(self):
        # Ensure available_quantity does not exceed total_quantity.
        if self.available_quantity > self.total_quantity:
            raise BookQuantityExceedError({
                'available_quantity': "Available quantity cannot exceed total quantity."
            })
        # Automatically set empty descriptions
        if self.description.strip() == '':
            self.description = 'No description available.'
            self.save()
    
    def __str__(self):
        return str(self.title)  



class BorrowRecord(models.Model):
    """
    Tracks when a user borrows and returns a specific book.

    Features:
    - Automatically sets a 14-day due date.
    - Ensures only one active borrow per user-book pair.
    - Enforces a 24-hour return cooldown.

    Error Handling:
    - Prevents duplicate borrow records.
    - Ensures logical borrow/due dates.
    - Raises errors for invalid operations (e.g., returning too soon, book not found).
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='borrows')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='borrows')
    borrow_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateTimeField(null=True, blank=True)
    return_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Record"
        verbose_name_plural = "Records" # Admin display name

    def __str__(self):
        return f"{self.user.username} borrowed {self.book.title}"
    
    def save(self, *args, **kwargs):
        if not self.due_date:
            self.due_date = self.borrow_date + timedelta(days=14)
        super().save(*args, **kwargs)

    def clean(self):
        # Ensure a user cannot borrow the same book
        already_borrowed = BorrowRecord.objects.filter(user=self.user, book=self.book, return_date__isnull=True)
        if already_borrowed:
            raise ValidationError({
                'book': str(BookAlreadyBorrowedError())
            })
        
        # Ensure the record's due date cannot be set to the borrow date or earlier
        if self.borrow_date >= self. due_date:
            raise ValidationError({
                'due_date': 'You cannot set the due date equal or earlier than the borrow date.'
            })

    @classmethod
    def borrow_book(self, user, book):
        """Borrow a book, if it's available and not already borrowed by the user."""
        # Book has no available quantiy 
        if book.available_quantity == 0:
            raise BookNotAvailableError()
        
        # Record found between the same user and book; already borrowed
        already_borrowed = self.objects.filter(user=user, book=book, return_date__isnull=True)
        if already_borrowed:
            raise BookAlreadyBorrowedError()
        
        record = self.objects.create(user=user,book=book)
        book.available_quantity -= 1
        book.save()
        return record

    @classmethod
    def return_book(self, user, book):
        """Return a book, enforcing a 24-hour cooldown and updating inventory."""
        record = self.objects.filter(
            user=user,
            book=book,
            return_date__isnull=True
        ).order_by('-due_date').first()
        
        current_time = timezone.now()
        cooldown = timezone.localtime(record.borrow_date + timedelta(hours=24))

        if record is None:
            raise BookRecordNotFoundError()
        elif record.borrow_date and current_time < cooldown:
            # Format cooldown time for display
            formatted_date = cooldown.strftime('%a %d %b, %Y, %I:%M%p').lstrip("0").replace(" 0", " ").replace('AM', ' a.m.').replace('PM', ' p.m.')
            raise BookReturnCooldownError(f"You cannot return this book until: {formatted_date}")
        
        # Finalize return
        record.return_date = current_time
        record.save()
        
        book.borrow_count += 1
        book.available_quantity += 1
        book.save()
        return record

    @classmethod
    def delete_book(self, book):
        """Delete a book from the system, or raise an error if it doesn't exist."""
        try:
            book.delete()
        except book.DoesNotExist:
            raise BookNotFoundError('This book has already been deleted!')



class Featured(models.Model):
    """
    Defines featured book blocks displayed on various pages.

    Features:
    - Supports 'popular', 'latest', and 'custom' types.
    - Custom types allow manual book selection (1–7 max).
    - Can target homepage, library page, or specific genre.

    Error Handling:
    - Prevents duplicate sections with same type/page/genre.
    - Enforces consistent order per page or genre block.
    - Validates genre-book consistency for custom blocks.
    - Ensures order is always greater than or equal to 1.
    """
    
    FEATURED_TYPE_CHOICES = [
        ('popular', 'Popular'),
        ('latest', 'Latest'),
        ('custom', 'Custom'),
    ]

    PAGE_TYPE_CHOICES = [
        ('home', 'Home'),
        ('library', 'Books'),
        ('genre', 'Genre'),
    ]

    title = models.CharField(max_length=20)
    featured_type = models.CharField(choices=FEATURED_TYPE_CHOICES, verbose_name='Type')
    books = models.ManyToManyField(
        Book, 
        blank=True, 
        help_text="Only accessible with 'Custom' type.<br>Required: Books must share the same genre if specified.<br>"
    )
    page_type = models.CharField(choices=PAGE_TYPE_CHOICES, verbose_name='Page')
    genre = models.ForeignKey(
        Genre, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        help_text="Required if Page is 'Genre': Determines which genre page this section appears on.<br>Optional for other types of pages: Deternmines what genre of books will be displayed."
    )
    order = models.PositiveIntegerField(
        default=1,
        help_text="Determines display order within the same page."
    )

    class Meta:
        verbose_name_plural = "Featured" # Admin label

    def clean(self):
        """Custom validation to enforce uniqueness and consistency per featured section."""
        super().clean()
        
        if self.order < 1:
            raise ValidationError({'order': 'Ensure this value is greater or equal to 1.'})

        # Prevent duplicate Featured entries with same (type, page, genre)
        if self.featured_type != 'custom':
            duplicates = Featured.objects.filter(
                featured_type=self.featured_type,
                page_type=self.page_type,
                genre=self.genre if self.page_type == 'genre' else None
            )
            # Exclude self if updating
            if self.pk:
                duplicates = duplicates.exclude(pk=self.pk)

            if duplicates.exists():
                raise ValidationError(
                    f"A Featured entry with type '{self.featured_type}', "
                    f"page_type='{self.page_type}', and genre='{self.genre}' already exists."
                )
        
        # Ensure only one section per order/page_type (and genre if applicable)
        scope_filter = {
            'page_type': self.page_type,
            'order': self.order,
        }

        if self.page_type == 'genre':
            scope_filter['genre'] = self.genre
        else:
            scope_filter['genre__isnull'] = True

        existing_orders = Featured.objects.filter(**scope_filter)
        # Exclude self from list
        if self.pk:
            existing_orders = existing_orders.exclude(pk=self.pk)

        if existing_orders.exists():
            raise ValidationError({'order': f'A section already exists with order {self.order} for this page.'})
        
        # Clean sort
        scope_filter_2 = scope_filter.copy()
        del scope_filter_2['order']
        qs = Featured.objects.filter(**scope_filter_2).order_by('order')
        for index, model in enumerate(qs, start=1):
            if model.order != index:
                model.order = index 
                model.save()

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.full_clean()  # Validate again post-save to catch M2M-related issues