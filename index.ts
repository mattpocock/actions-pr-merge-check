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

    const existingIssues = await octokit.issues.listForRepo({
      ...github.context.repo,
    });

    const prBranches = pullRequests.data.map(pr => pr.head.ref);

    execSync('git config --global user.email "you@example.com"');
    execSync('git config --global user.name "Your Name"');
    execSync(`git config --global advice.detachedHead false`);

    prBranches.forEach(branch => {
      const branchesToCompare = prBranches.filter(b => b !== branch);
      execSync(`git checkout origin/${branch}`);

      const conflictingBranches = branchesToCompare.filter(
        branchToTryMergingIn => {
          try {
            execSync(
              `git merge origin/${branchToTryMergingIn} --no-commit --no-ff && git merge --abort`,
            );
            return false;
          } catch (e) {
            /** If this failed, then the merge failed */
            execSync("git merge --abort");
            return true;
          }
        },
      );
      console.log({ branch, conflictingBranches });
    });

    // console.log(JSON.stringify(pullRequests.data.map(pr => pr), null, 2));
    // console.log(JSON.stringify(existingIssues.data, null, 2));
  } catch (error) {
    core.setFailed(error.message);
  }
};

run().catch(e => {
  core.setFailed(e);
});
