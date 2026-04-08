class AppError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppError):
    pass


class ConflictError(AppError):
    pass


class ValidationError(AppError):
    pass
