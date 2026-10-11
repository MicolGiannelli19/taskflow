"""App-wide foundations: settings, errors, roles, the Clerk client, security headers.

Modules here may import each other, but never ``app.routers``, ``app.services``
or ``app.database`` — everything else depends on core, not the other way round.
"""
