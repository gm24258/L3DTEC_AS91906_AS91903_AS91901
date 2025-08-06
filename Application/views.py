from typing import Any
from django.db.models import Q
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.urls import reverse
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.http import require_POST
from django.db.models import Case, When, F, Value, DateTimeField, BooleanField
from django.db.models.functions import Coalesce
from .models import *
from .forms import *
from .exceptions import *
import json
import re

"""
RENDERING VIEWS: Functions to render various pages with context data.
"""
def view_home(request): 
    """
    Renders the homepage with genre data.

    Features:
    - Provides whether the user is in the 'Staff' group for frontend usage.
    - Provides genres for dynamic content rendering (mainly the navbar).
    """
    
    # Get all genres as list of dicts
    genres = list(Genre.objects.values())
        
    context = {
        'is_staff': request.user.groups.filter(name='Staff').exists(),
        'genres': genres
    }
    
    return render(request, 'main.html', context)



def view_library(request):
    """
    Renders the library page with genre (raw and JSON) data.

    Features:
    - Provides whether the user is in the 'Staff' group for frontend usage.
    - Provides raw data genres for dynamic content rendering (mainly the navbar).
    - Provides genres as JSON for JavaScript usage.
    """
    
    # Get all genres as list and JSON string
    genres = list(Genre.objects.values())
    genres_json = json.dumps(genres)
        
    context = {
        'is_staff': request.user.groups.filter(name='Staff').exists(),
        'genres': genres,
        'genres_json': genres_json
    }
    return render(request, 'library.html', context)



def view_genre(request, name):
    """
    Renders a genre-specific page.

    Features:
    - Provides whether the user is in the 'Staff' group for frontend usage.
    - Retrieves a genre by name (case-insensitive) and provides it to the frontend.
    - Provides raw data genres for dynamic content rendering (mainly the navbar).
    - Provides genres as JSON for JavaScript usage.

    Error Handling:
    - Returns 404 if genre does not exist.
    """
    
    # Get genre or 404 if not found (case insensitive)
    genre = get_object_or_404(Genre, name__iexact=name)
    genres = list(Genre.objects.values())
    genres_json = json.dumps(genres)

    context = {
        'is_staff': request.user.groups.filter(name='Staff').exists(),
        'selected_genre': genre,
        'genres': genres,
        'genres_json': genres_json
    }
    return render(request, 'genre.html', context)
    


def view_book(request, isbn):
    """
    Renders a book-specific page.

    Features:
    - Provides whether the user is in the 'Staff' group for frontend usage.
    - Retrieves a book by ISBN and provides its data to the frontend.
    - Retreives borrow record if the user is authenticated and the record is active.
    - Provides raw data genres for dynamic content rendering (mainly the navbar).
    - Provides genres as JSON for JavaScript usage.

    Error Handling:
    - Raises BookNotAvailableError if no copies are left and displays it to the frontend.
    - Handles missing or unauthorized users safely when retrieving borrow records.
    """
    
    
    # Get book by ISBN or 404
    book = get_object_or_404(Book, ISBN=isbn)
    record = None
    quantity_error_msg = None

    try:
        # Raise error if no available copies
        if book.available_quantity == 0:
            raise BookNotAvailableError("No more copies available!")
        
        # If user logged in, get current borrow record (if any)
        if request.user.is_authenticated:
            record = BorrowRecord.objects.filter(user=request.user, book=book, return_date__isnull=True).first()
    except BookNotAvailableError as e:
        quantity_error_msg = str(e)

    genres = list(Genre.objects.values())

    context = {
        'book': book,
        'record': record,
        'quantity_error_msg': quantity_error_msg,
        'is_staff': request.user.groups.filter(name='Staff').exists(),
        'genres': genres,
    }
    return render(request, 'book.html', context)



def view_borrows(request):
    """
    Renders the user's borrow record page.

    Features:
    - Provides whether the user is in the 'Staff' group for frontend usage.
    - Provides genres for dynamic content rendering (mainly the navbar).

    Error Handling:
    - Redirects TO home page if user is not authenticated.
    """

    # Only authenticated users allowed
    if not request.user.is_authenticated:
        return redirect(reverse('home'))
    
    genres = list(Genre.objects.values())

    context = {
        'is_staff': request.user.groups.filter(name='Staff').exists(),
        'genres': genres,
    }
    return render(request, 'borrows.html', context)



"""
POST VIEWS: Functions to handle POST requests for functions like borrowing, returning, and deleting books.
"""
@require_POST
def borrow_book(request):
    """
    Allows an authenticated user to borrow a book.

    Features:
    - Accepts ISBN via GET param.
    - Returns JSON success or error messages.

    Error Handling:
    - Handles missing ISBN.
    - BookAlreadyBorrowedError if book already borrowed.
    - BookNotAvailableError if book has 0 quantity.
    - ValidationError for other errors.
    - Returns custom errors as JSON for frontend handling, while other errors as ValidationErrors are printed to the console.
    """

    # Only authenticated users allowed otherwise redirected to login page
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'redirect': reverse('login')})
    
    isbn = request.GET.get('isbn')
    if not isbn:
        return JsonResponse({'success': False, 'log_error': 'Missing required parameter: isbn'})
    
    book = get_object_or_404(Book, ISBN=isbn)
    try:
        # Attempt to borrow book, handling possible errors
        BorrowRecord.borrow_book(request.user, book)
        return JsonResponse({'success': True})
    except BookNotAvailableError as e:
        return JsonResponse({'success': False, 'modal_error': str(e)})
    except BookAlreadyBorrowedError as e:
        return JsonResponse({'success': False, 'modal_error': str(e)})
    except ValidationError as e:
        return JsonResponse({'success': False, 'log_error': f'An error has occurred!\n{str(e)}'})



@require_POST
def return_book(request):
    """
    Handles book returns by an authenticated user.

    Features:
    - Accepts ISBN via GET param.
    - Validates borrow record and return cooldown.
    - Returns JSON success or error messages.

    Error Handling:
    - Handles missing ISBN.
    - BookRecordNotFoundError if no borrow exists.
    - BookReturnCooldownError if cooldown not met.
    - ValidationError for other errors.
    - Returns custom errors as JSON for frontend handling, while other errors as ValidationErrors are printed to the console.
    """

    # Only authenticated users allowed otherwise redirected to login page
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'redirect': reverse('login')})
    
    isbn = request.GET.get('isbn')
    if not isbn:
        return JsonResponse({'success': False, 'modal_error': 'Missing required parameter: isbn'})
    
    book = get_object_or_404(Book, ISBN=isbn)
    try:
        # Attempt to return book, handling possible errors
        BorrowRecord.return_book(request.user, book)
        return JsonResponse({'success': True})
    except BookRecordNotFoundError as e:
        return JsonResponse({'success': False, 'modal_error': str(e)})
    except BookReturnCooldownError as e:
        return JsonResponse({'success': False, 'modal_error': str(e)})
    except ValidationError as e:
        return JsonResponse({'success': False, 'log_error': f'An error has occurred!\n{str(e)}'})



@require_POST
def delete_book(request):
    """
    Allows staff to delete a book from the system.

    Features:
    - Accepts ISBN via GET param.
    - Deletes book if exists.
    - Redirects to library on success.

    Error Handling:
    - Only allows staff users.
    - Handles missing ISBN or book not found.
    - Returns custom errors as JSON for frontend handling, while other errors as ValidationErrors are printed to the console.
    """
    
    # Only authenticated staff users allowed
    if not request.user.is_authenticated and not request.user.groups.filter(name='Staff').exists() :
        return JsonResponse({'success': False, 'modal_error': 'An error has occurred!'})
    
    isbn = request.GET.get('isbn')
    if not isbn:
        return JsonResponse({'success': False, 'modal_error': 'Missing required parameter: isbn'})
    
    book = get_object_or_404(Book, ISBN=isbn)
    try:
        # Delete book or raise error if not found
        record = BorrowRecord.delete_book(book)
        return JsonResponse({'success': True,  'redirect': reverse('library')})
    except BookNotFoundError as e:
        return JsonResponse({'success': False, 'modal_error': str(e)})
    except ValidationError as e:
        return JsonResponse({'success': False, 'log_error': f'An error has occurred!\n{str(e)}'})
    


@require_POST
def logout_user(request):
    """
    Logs out an authenticated user and returns JSON success status.

    Error Handling:
    - Returns failure if user is not authenticated.
    """

    # If user is not logged in, immediately respond with failure
    if not request.user.is_authenticated:
        return JsonResponse({'success': False})
    
    # Log out the authenticated user
    logout(request)
    return JsonResponse({'success': True})
    


"""
HYBRID RENDERING VIEWS: Functions that handle both rendering and HTTP methods.
"""
def login_user(request):
    """
    Handles user login.

    Features:
    - GET: Renders login page with genre list and form.
    - POST: Authenticates credentials and logs in user.
    - Logs in user and redirects to 'next' param or home page.

    Error Handling:
    - Returns JSON with validation errors.
    - Redirects already authenticated users.
    """

    # Redirect authenticated users to 'next' or home
    url = request.GET.get('next') or reverse('home')
    if request.user.is_authenticated:
        return redirect(url)
    
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            # Authenticate credentials and log user in
            username = request.POST['username']
            password = request.POST['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({'success': True, 'redirect_url': url})
            else:
                return JsonResponse({'success': False, 'errors': {'password': 'Invalid username or password'}})
        else:
            # Return form validation errors
            errors = {field: err[0] for field, err in form.errors.items()}
            return JsonResponse({'success': False, 'errors': errors})
            
    # GET request: show empty login form
    genres = list(Genre.objects.values())
    context = {
        'form': LoginForm(),
        'is_staff': request.user.groups.filter(name='Staff').exists(),
        'genres': genres,
    }
    return render(request, 'login.html', context)



def register_user(request):
    """
    Handles user registration.

    Features:
    - GET: Renders registration form with genre list.
    - POST: Validates form and creates new user.
    - Logs in user after successful registration, and redirects to 'next' param or home page.

    Error Handling:
    - Returns JSON with field-specific validation errors.
    - Redirects already authenticated users.
    """

    # Redirect authenticated users to 'next' or home
    url = request.GET.get('next') or  reverse('home')
    if request.user.is_authenticated:
        return redirect(url)
    
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            # Save new user and log them in
            user = form.save()
            login(request, user)
            return JsonResponse({'success': True, 'redirect_url': url})
        else:
            # Return form validation errors
            errors = {field: err[0] for field, err in form.errors.items()}
            return JsonResponse({'success': False, 'errors': errors})
            
    # GET request: show empty registration form
    genres = list(Genre.objects.values())
    context = {
        'form': RegisterForm(),
        'is_staff': request.user.groups.filter(name='Staff').exists(),
        'genres': genres,
    }
    return render(request, 'register.html', context)




"""
API VIEWS: Functions to handle API requests for data retrieval.
"""
def get_featured_data(request):
    """
    Returns featured sections and book data for a given page where its frontend called it.

    Features:
    - Accepts page type and optional genre via GET.
    - Retreives all featured sections for the page.
    - Handles 'popular', 'latest', and 'custom' order logic, and genre filter logic, from the featured sections to the book lists.
    - Returns featured and book data in JSON format for frontend JS rendering.

    Error Handling:
    - Returns 400 error if 'page' parameter is missing.
    """
    params = request.GET
    page_type = params.get('page')
    genre = params.get('genre')

    # Require 'page' parameter
    if not page_type:
        return JsonResponse({'error': 'Missing required parameter: page'}, status=400)

    filters = (
        Q(page_type=page_type)
    )
    if genre:
        filters &= Q(genre__name = genre)

    # Get all featured sections for page and optional genre, ordered by display order
    sections = Featured.objects.filter(filters).distinct().order_by('order')

    data = []
    for section in sections:
        books = []
        if section.featured_type == 'popular' or section.featured_type == 'latest':
            order = {
                'popular': '-borrow_count',
                'latest': '-date_published',
            }
            if genre:
                # Filter books by genre and order accordingly
                books = Book.objects.filter(
                    genres__name=genre
                ).order_by(order[section.featured_type])[:7]
            else:
                # No genre filter, get top books overall
                books = Book.objects.all().order_by(order[section.featured_type])[:7]
        elif section.featured_type == 'custom':
            # Use custom assigned books
            books = section.books.all()

        # Prepare book info for JSON response
        book_data = [
            {
                'title': book.title,
                'ISBN': book.ISBN,
                'cover': book.cover.name if book.cover else ""
            }
            for book in books
        ]

        # Append section info with books to response data
        data.append({
            'title': section.title,
            'books': book_data
        })

    return JsonResponse(data, safe=False)




def get_records_data(request):
    """
    Returns all borrow records for the current user.

    Features:
    - Annotates records with active status and sort date.
    - Returns list in JSON format for frontend JS rendering.

    Error Handling:
    - Returns 400 error if user is not authenticated.
    """

    params = request.GET
    user = request.user

    # User is not authenticated: requires user for this view to work
    if not user.is_authenticated:
        return JsonResponse({'error': 'User is not authenticated'}, status=400)

    # Query all borrow records for user, annotate active status and sort date
    records = BorrowRecord.objects.filter(user=user).annotate(
        is_active=Case(
            When(return_date__isnull=True, then=Value(True)),
            default=Value(False),
            output_field=BooleanField()
        ),
        sort_date=Coalesce('return_date', 'borrow_date', output_field=DateTimeField())
    ).order_by('-is_active', '-sort_date')

    # Return serialized record data as JSON
    return JsonResponse(list(records.values(
        'id',
        'borrow_date',
        'due_date',
        'return_date',
        'book__id',
        'book__ISBN',
        'book__title',
        'book__author',
        'book__cover'
    )), safe=False)



def search_books(request):
    """
    Searches for books based on title, author, ISBN, and genres.

    Features:
    - Accepts 'q', 'genres', and 'sort' GET params.
    - Filters books by title, author, or ISBN matching the query.
    - Filters by genres if provided.
    - Sbooks by popularity, newest, or oldest.
    - Returns matching books in JSON with staff status, in JSON format for frontend JS rendering.

    Error Handling:
    - Handles empty or malformed query gracefully.
    """
    params = request.GET
    query = params.get('q', '')
    sort = params.get('sort', 'popular')
    genre_list = [g.strip() for g in params.get('genres', '').split(',') if g.strip()]
    
    filters = Q()
    if query:
        # Search in title, author, or ISBN case-insensitively
        # Query only searches for books where at least one word in the title/author/ISBN starts with the query
        escaped = re.escape(query)
        filters &= (
            Q(title__iregex=rf'\b{escaped}') |
            Q(author__iregex=rf'\b{escaped}') |
            Q(ISBN__iregex=rf'\b{escaped}')
        )

    if genre_list:
        # Add filter to match any genre name (case-insensitive exact match)
        for genre_name in genre_list:
            filters |= Q(genres__name__iexact=genre_name)

    # Query books matching filters, distinct to avoid duplicates
    books = Book.objects.filter(filters).distinct()

    # Sort results by requested method
    if sort == 'popularity':
        books = books.order_by('-borrow_count')
    elif sort == 'latest':
        books = books.order_by('-date_published')
    elif sort == 'oldest':
        books = books.order_by('date_published')

    return JsonResponse({'books': list(books.values()), 'is_staff': request.user.groups.filter(name='Staff').exists()}, safe=False)



def search_records(request):
    """
    Searches user borrow records by book title, author, or ID.

    Features:
    - Accepts 'q' and 'sort' GET params.
    - Filters records by its id, book title, author, or ISBN matching the query.
    - Returns matching records in JSON format for frontend JS rendering.

    Error Handling:
    - Handles empty or malformed query gracefully.
    """
    
    params = request.GET
    query = params.get('q', '')
    sort = params.get('sort', 'latest')
    
    filters = Q()
    if query:
        # Filter records by book title, author, or ISBN containing query
        # Query only searches for books where at least one word in the title/author/ISBN starts with the query
        # Alternatively query can search for record IDs
        escaped = re.escape(query)
        filters &= (
            Q(book__title__iregex=rf'\b{escaped}') |
            Q(book__author__iregex=rf'\b{escaped}') |
            Q(book__ISBN__iregex=rf'\b{escaped}') |
            Q(id__startswith=query)
        )

    records = BorrowRecord.objects.filter(filters).distinct()

    # Annotate active status and sort records based on sort param
    if sort == 'latest':
        records = records.annotate(
            is_active=Case(
                When(return_date__isnull=True, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            ),
            sort_date=Coalesce('return_date', 'borrow_date', output_field=DateTimeField())
        ).order_by('-is_active', '-sort_date')

    elif sort == 'oldest':
        records = records.annotate(
            is_active=Case(
                When(return_date__isnull=True, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()
            ),
            sort_date=Coalesce('return_date', 'borrow_date', output_field=DateTimeField())
        ).order_by('-is_active', 'sort_date')

    # Return filtered and sorted records as JSON
    return JsonResponse(list(records.values(
        'id',
        'book__id',
        'book__ISBN',
        'book__title',
        'book__author',
        'book__cover'
    )), safe=False)