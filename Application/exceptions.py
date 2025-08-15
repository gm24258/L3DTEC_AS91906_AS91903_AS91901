from django.core.exceptions import ValidationError

class BookQuantityExceedError(ValidationError):
    """
    Raised when a book's available quantity is somehow greater than its total quantity.
    Inherits from Django's ValidationError so it can be used in form/model clean() methods.
    """
    def __init__(self, msg=None):
        default = "This book is no longer available"
        super().__init__(msg or default)



class BookNotAvailableError(Exception):
    """
    Raised when a book has 0 available quantity and cannot be borrowed.
    """
    def __init__(self, msg=None):
        default = "This book is no longer available"
        super().__init__(msg or default)



class BookAlreadyBorrowedError(Exception):
    """
    Raised when a user attempts to borrow a book they have already borrowed.
    Prevents duplicate borrow records.
    """
    def __init__(self, msg=None):
        default = "This book has already been borrowed!"
        super().__init__(msg or default)



class BookNotFoundError(Exception):
    """
    Raised when the specified book cannot be found in the database.
    """
    def __init__(self, msg=None):
        default = "This book does not exist or was deleted!"
        super().__init__(msg or default)



class BookRecordNotFoundError(Exception):
    """
    Raised when a user attempts to return a book they never borrowed
    (i.e., no matching record exists).
    """
    def __init__(self, msg=None):
        default = "You have not borrowed this book or you have already returned it!"
        super().__init__(msg or default)



class BookBorrowCooldownError(Exception):
    """
    Raised when a user tries to borrow a book too quickly after returning the book previously,
    Prevents excessive use of borrowing/returning.
    """
    def __init__(self, msg=None):
        default = "You have borrowed this book recently"
        super().__init__(msg or default)