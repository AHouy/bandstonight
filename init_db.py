from .app import app, db

if app.debug:
    db.drop_all()
db.create_all()
