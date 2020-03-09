import * as core from "@actions/core";
import * as github from "@actions/github";
import { execSync } from "child_process";

const run = async () => {
  try {
    const repoToken = core.getInput("repo-token");
    const octokit = new github.GitHub(repoToken);

    const pullRequests = await octokit.pulls.list({
      ...github.context.repo,
      state: "open",
    });

    // const existingIssues = await octokit.issues.list({
    //   state: "open",
    // });

    const prBranches = pullRequests.data.map(pr => ({
      ref: pr.head.ref,
      id: pr.number,
      title: pr.title,
    }));

    execSync('git config --global user.email "you@example.com"');
    execSync('git config --global user.name "Your Name"');
    execSync(`git config --global advice.detachedHead false`);

    const messagesToPost = prBranches
      .map(({ ref, id, title }) => {
        const branchesToCompare = prBranches.filter(
          branch => branch.ref !== ref,
        );
        execSync(`git checkout origin/${ref}`);

        const conflictingBranches = branchesToCompare.filter(
          branchToTryMergingIn => {
            try {
              execSync(
                `git merge origin/${branchToTryMergingIn.ref} --no-commit --no-ff && git merge --abort`,
              );
              return false;
            } catch (e) {
              /** If this failed, then the merge failed */
              try {
                execSync(`git merge --abort`);
              } catch (e) {}
              return true;
            }
          },
        );
        return { ref, conflictingBranches, pullRequestId: id };
      })
      .filter(({ conflictingBranches }) => conflictingBranches.length > 0);

    await messagesToPost.reduce(
      async (promise, { pullRequestId, conflictingBranches }) => {
        await promise;

        const previousComments = await octokit.issues.listComments({
          ...github.context.repo,
          issue_number: pullRequestId,
        });

        const commentsToDelete = previousComments.data.filter(comment => {
          return comment.body.includes(
            [
              "### Pull Request Conflicts With Others",
              "",
              "This PR has conflicts with:",
            ].join("\n"),
          );
        });

        await commentsToDelete.reduce(async (deletePromise, { id }) => {
          await deletePromise;
          await octokit.issues.deleteComment({
            ...github.context.repo,
            comment_id: id,
          });
        }, Promise.resolve() as any);

        return octokit.issues.createComment({
          ...github.context.repo,
          issue_number: pullRequestId,
          body: [
            "### Pull Request Conflicts With Others",
            "",
            "This PR has conflicts with:",
            "",
            `${conflictingBranches
              .map(({ id, title }) => `#${id} - ${title}`)
              .join("\n")}`,
            "",
            "You may want to resolve the conflicts before merging.",
          ].join("\n"),
        });
      },
      Promise.resolve() as any,
    );

    // console.log(JSON.stringify(pullRequests.data.map(pr => pr), null, 2));
    // console.log(JSON.stringify(existingIssues.data, null, 2));
  } catch (error) {
    console.error(error);
    core.setFailed(error.message);
  }
};

run().catch(e => {
  core.setFailed(e);
});
