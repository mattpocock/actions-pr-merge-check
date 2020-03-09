import * as core from "@actions/core";
import * as github from "@actions/github";

const run = async () => {
  try {
    const repoToken = core.getInput("repo-token");
    const octokit = new github.GitHub(repoToken);

    const pullRequests = await octokit.pulls.list({
      ...github.context.repo,
      state: "open",
    });

    const existingIssues = await octokit.issues.list({
      state: "open",
    });

    console.log(JSON.stringify(pullRequests, null, 2));
    console.log(JSON.stringify(existingIssues, null, 2));
  } catch (error) {
    core.setFailed(error.message);
  }
};

run().catch(e => {
  core.setFailed(e);
});
