#!/bin/bash
echo "Running for commit: $GITHUB_SHA"
COMMIT_PARENTS=$(git show --parents --format=%P $GITHUB_SHA)
echo "COMMIT_PARENTS: $COMMIT_PARENTS"
IS_MERGE=$(git show --no-patch --format=%P $GITHUB_SHA | grep -c " ")
echo "IS_MERGE: $IS_MERGE"
if [ $IS_MERGE -eq 0 ]; then echo "Not a merge commit, abort step"; exit 0; fi
NEW_VERSION=`npm version patch --no-git-tag-version`
echo "Updating package.json with $NEW_VERSION"
sed -i "s/\"version\": .*/\"version\": \"$NEW_VERSION\",/" package.json
git config --local user.email "$GITHUB_ACTOR@users.noreply.github.com"
git config --local user.name "$GITHUB_ACTOR"
git add package.json
git commit -m "Incremented patch version to $NEW_VERSION"
echo "Pushing..."
git push