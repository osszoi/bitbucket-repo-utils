const axios = require('axios');
const { execSync } = require('child_process');

// Config part
const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, 'config.json');

// Load credentials from the config file
function loadCredentials(path = configFilePath) {
	if (fs.existsSync(path)) {
		return JSON.parse(fs.readFileSync(path, 'utf8'));
	}
	return { username: '', appPassword: '' };
}

// Save credentials to the config file
function saveCredentials(credentials, path = configFilePath) {
	fs.writeFileSync(path, JSON.stringify(credentials, null, 2));
}

// Function to approve a PR
async function approvePR(username, appPassword, workspace, repoSlug, prId) {
	const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/approve`;
	try {
		await axios.post(
			url,
			{},
			{
				auth: { username, password: appPassword }
			}
		);
		console.log('Pull request approved.');
	} catch (error) {
		console.error(`Failed to approve PR: ${error.message}`);
	}
}

// Function to decline a PR
async function declinePR(username, appPassword, workspace, repoSlug, prId) {
	const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/decline`;
	try {
		await axios.post(
			url,
			{},
			{
				auth: { username, password: appPassword }
			}
		);
		console.log('Pull request declined.');
	} catch (error) {
		console.error(`Failed to decline PR: ${error.message}`);
	}
}

// Function to merge a PR
async function mergePR(username, appPassword, workspace, repoSlug, prId) {
	const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/merge`;
	try {
		await axios.post(
			url,
			{},
			{
				auth: { username, password: appPassword }
			}
		);
		console.log('Pull request merged.');
	} catch (error) {
		console.error(`Failed to merge PR: ${error.message}`);
	}
}

// Function to unapprove a PR
async function unapprovePR(username, appPassword, workspace, repoSlug, prId) {
	const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/approve`;
	try {
		await axios.delete(url, {
			auth: { username, password: appPassword }
		});
		console.log('Pull request unapproved.');
	} catch (error) {
		console.error(`Failed to unapprove PR: ${error.message}`);
	}
}

// Fetch repositories from Bitbucket
async function fetchRepositories(username, appPassword) {
	const baseUrl = `https://api.bitbucket.org/2.0/repositories?role=member`;
	let repositories = [];
	let url = baseUrl;

	try {
		while (url) {
			const response = await axios.get(url, {
				auth: { username, password: appPassword }
			});

			repositories = repositories.concat(
				response.data.values.map((repo) => ({
					...repo,
					nameWithWorkspace: `${repo.owner.display_name} / ${repo.name}`,
					workspace: repo.owner.username,
					cloneUrl: repo.links.clone.find((link) => link.name === 'https').href
				}))
			);

			url = response.data.next || null;
		}

		return repositories;
	} catch (error) {
		console.error('Error fetching repositories:', error.message);
	}
}

function cloneRepository(cloneUrl) {
	console.log(`Cloning repository from ${cloneUrl}...`);
	try {
		execSync(`git clone ${cloneUrl}`, { stdio: 'inherit' });
		console.log('Repository cloned successfully!');
	} catch (error) {
		console.error('Failed to clone repository:', error);
	}
}

async function fetchWorkspaces(username, appPassword) {
	const url = `https://api.bitbucket.org/2.0/repositories?role=member`;
	try {
		const response = await axios.get(url, {
			auth: {
				username,
				password: appPassword
			}
		});
		return Array.from(
			new Set(response.data.values.map(({ workspace }) => workspace.slug))
		); // Return list of workspace names
	} catch (error) {
		throw new Error('Error fetching workspaces: ' + error.message);
	}
}

async function fetchOpenPRs(username, appPassword, workspace, repoSlug) {
	const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests?state=OPEN`;
	try {
		const response = await axios.get(url, {
			auth: {
				username,
				password: appPassword
			}
		});
		return response.data.values; // Return the list of open pull requests
	} catch (error) {
		throw new Error('Error fetching PRs: ' + error.message);
	}
}

async function createPullRequest(
	username,
	appPassword,
	workspace,
	repoSlug,
	title,
	sourceBranch,
	destinationBranch
) {
	const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug.replace(
		'.git',
		''
	)}/pullrequests`;

	const data = {
		title,
		source: { branch: { name: sourceBranch } },
		destination: { branch: { name: destinationBranch } }
	};

	try {
		const response = await axios.post(url, data, {
			auth: { username, password: appPassword }
		});
		console.log('Pull request created:', response.data.links.html.href);
	} catch (error) {
		console.error('Failed to create pull request:', error.message);
		console.error('Did you pushed the branch before trying to create the PR?');
	}
}

async function checkBranchExists(username, appPassword, repoSlug, branch) {
	try {
		await axios.get(
			`https://api.bitbucket.org/2.0/repositories/${repoSlug}/refs/branches/${branch}`,
			{
				auth: {
					username,
					password: appPassword
				}
			}
		);

		return true;
	} catch (error) {
		return false;
	}
}

export default {
	approvePR,
	declinePR,
	mergePR,
	unapprovePR,
	fetchRepositories,
	cloneRepository,
	fetchWorkspaces,
	fetchOpenPRs,
	createPullRequest,
	checkBranchExists,
	loadCredentials,
	saveCredentials
};
