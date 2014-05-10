init:
	@echo 'create git pre-commit hook'
	ln -s ../../scripts/lint/lint.sh .git/hooks/pre-commit	
	@echo 'adjust pre-commit hook file permission'
	chmod +x .git/hooks/pre-commit
	@echo 'install dependencies'
	npm install
	@echo 'done'

.PHONY: test
test:
	@echo 'test gracenode:'
	./node_modules/mocha/bin/mocha test/index.js -R spec -b

.PHONY: test-module
test-module:
	@echo 'test gracenode module $(module):'
	./node_modules/mocha/bin/mocha test/$(module)/index.js -R spec -b

.PHONY: test-iap
test-iap:
	@echo 'test gracenode module iap:'
	./node_modules/mocha/bin/mocha test/iap/index.js -R spec -b  --path=$(path) --service=$(service)
