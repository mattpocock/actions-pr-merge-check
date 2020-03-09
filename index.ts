import core from "@actions/core";
import { GitHub, context } from "@actions/github";

const run = async () => {
  try {
    const repoToken = core.getInput("repo-token");
    const octokit = new GitHub(repoToken);

    const pullRequests = await octokit.pulls.list({
      ...context.repo,
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

run();
