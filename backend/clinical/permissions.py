from rest_framework import permissions


class IsOwnerProfessional(permissions.BasePermission):
    """
    Restricts access to objects owned by the authenticated professional.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        owner = getattr(obj, 'professional', None)
        if owner:
            return owner_id(owner) == owner_id(user)

        patient = getattr(obj, 'patient', None)
        if patient and patient.professional:
            return owner_id(patient.professional) == owner_id(user)

        return False


def owner_id(professional):
    return getattr(professional, 'pk', None)
