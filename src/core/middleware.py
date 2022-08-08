from django.core.management import call_command


class MigrateMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Call migrate on every call
        call_command("migrate", interactive=False)
        response = self.get_response(request)
        return response
