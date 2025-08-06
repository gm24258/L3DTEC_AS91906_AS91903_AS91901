from django import forms
from django.contrib.auth.models import User
from .models import Featured
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.core.exceptions import ValidationError

class RegisterForm(UserCreationForm):
    """
    Custom user registration form extending Django's UserCreationForm.

    Features:
    - Adds first name, last name, and email fields with placeholders.
    - Applies consistent CSS classes and autofocus.
    - Ensures email uniqueness to prevent duplicate accounts.

    Error Handling:
    - Raises ValidationError if an email is already in use.
    """

    # Define additional fields with placeholders for better UX
    first_name = forms.CharField(max_length=100, widget=forms.TextInput(attrs={'placeholder': 'E.g. Gurt'}))
    last_name = forms.CharField(max_length=100, widget=forms.TextInput(attrs={'placeholder': 'E.g. Yo'}))
    username = forms.CharField(max_length=100, widget=forms.TextInput(attrs={'placeholder': 'Enter your username'}))
    email = forms.EmailField(widget=forms.TextInput(attrs={'placeholder': 'E.g. gurtyo@goon.com'}))
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput(attrs={'placeholder': 'Enter your password'}))
    password2 = forms.CharField(label='Repeat password', widget=forms.PasswordInput(attrs={'placeholder': 'Repeat password'}))

    class Meta:
        model = User # Use Django's built-in User model
        fields = ['first_name', 'last_name', 'username', 'email', 'password1', 'password2']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Apply consistent CSS class and set autofocus only on first_name field
        for name, field in self.fields.items():
            field.widget.attrs['class'] = 'form-input'
            if name != 'first_name':
                field.widget.attrs['autofocus'] = False
            else:
                field.widget.attrs['autofocus'] = True
    
    def clean_email(self):
        # Validates email by ensuring it is unique
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise ValidationError('This email has already been used.')
        return email



class LoginForm(AuthenticationForm):
    """
    Custom user login form extending Django's AuthenticationForm.

    Features:
    - Adds input placeholders and CSS styling.
    - Sets autofocus on username for better UX.

    Error Handling:
    - Inherits built-in authentication validation from Django.
    """

    # Override default fields to apply placeholders
    username = forms.CharField(max_length=100, widget=forms.TextInput(attrs={'placeholder': 'Enter your username'}))
    password = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder': 'Enter your password'}))
    
    class Meta:
        model = User
        fields = ['username', 'password']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Apply consistent CSS class and autofocus logic
        for name, field in self.fields.items():
            field.widget.attrs['class'] = 'form-input'
            if name != 'username':
                field.widget.attrs['autofocus'] = False
            else:
                field.widget.attrs['autofocus'] = True



class FeaturedAdminForm(forms.ModelForm):
    """
    Admin form for the Featured model with conditional validation.

    Features:
    - Validates logic between 'featured_type', 'books', and 'genre'.
    - Enforces genre-book consistency for custom featured blocks.
    - Limits book selection to 1–7 for custom types.

    Error Handling:
    - Raises ValidationError if:
        - Custom type is selected without 1–7 books.
        - Any selected book does not match the selected genre.
        - Non-custom types have books assigned.
    """

    class Meta:
        model = Featured
        fields = '__all__' # Include all model fields in the form

    def clean(self):
        # Custom form validation logic for Featured admin entries
        cleaned_data = super().clean()

        featured_type = cleaned_data.get('featured_type')
        books = cleaned_data.get('books')
        genre = cleaned_data.get('genre')

        if featured_type == 'custom':
            if not books or books.count() == 0:
                raise forms.ValidationError('You must select at least one book for Custom type.')
            elif books.count() > 7:
                raise forms.ValidationError('You can select a maximum of 7 books.')

            if genre:
                # Check if each selected book belongs to the selected genre
                for book in books:
                    book_genre_ids = set(book.genres.values_list('id', flat=True))
                    if genre.id not in book_genre_ids:
                        raise forms.ValidationError(
                            f"The book '{book.title}' does not belong to the selected genre '{genre}'."
                        )
        else:
            # Prevent assigning books unless featured type is 'custom'
            if books and books.exists():
                raise forms.ValidationError("Books can only be set when type is Custom.")

        return cleaned_data