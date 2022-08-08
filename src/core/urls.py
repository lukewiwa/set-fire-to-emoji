from django.urls import path

from core.views import ResultView, SetFireView

urlpatterns = [
    path("", SetFireView.as_view(), name="set-fire"),
    path("<uuid:pk>/", ResultView.as_view(), name="set-fire-result"),
]
