test:
	./node_modules/.bin/mocha --reporter spec --timeout 3000 ./test/*.js

.PHONY: test
