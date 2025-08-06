"""
URL configuration for Test project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from Application.views import *

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', view_home, name='home'),
    path('library/', view_library, name='library'),
    path('register/', register_user, name='register'),
    path('login/', login_user, name='login'),
    path('library/book/<str:isbn>/', view_book, name='book_details'),
    path('library/genre/<str:name>/', view_genre, name='genre'),
    path('your-borrows', view_borrows, name='borrows'),
    path('api/logout/', logout_user, name='logout'),
    path('api/search-books/', search_books, name='book_search'),
    path('api/search-records/', search_records, name='record_search'),
    path('api/borrow-book/', borrow_book, name='borrow_book'),
    path('api/return-book/', return_book, name='return_book'),
    path('api/admin/delete-book/', borrow_book, name='borrow_book'),
    path('api/get-featured-data/', get_featured_data, name='featured_data'),
    path('api/get-records-data/', get_records_data, name='records_data'),
]

if settings.DEBUG: 
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)