from django.urls import path

from core.views import IndexView, OldManYellsAtView, ResultView, SetFireView

urlpatterns = [
    path("", IndexView.as_view(), name="index"),
    path("set_fire/", SetFireView.as_view(), name="set-fire"),
    path("old_man_yells_at/", OldManYellsAtView.as_view(), name="old-man-yells-at"),
    path("<uuid:pk>/", ResultView.as_view(), name="set-fire-result"),
]
