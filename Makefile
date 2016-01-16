all:
	iconutil -c icns pingbot.iconset
	electron-packager . pingbot --platform=darwin --arch=x64 --version=0.36.2 --overwrite --icon=pingbot.icns
