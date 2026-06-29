import { expect, test } from "@playwright/test";

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // 无存档时先创建
  const startBtn = page.getByRole("button", { name: "开始航海" });
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForURL("/");
    await page.waitForLoadState("networkidle");
  }

  await expect(page.getByRole("heading", { name: "泉州" })).toBeVisible({
    timeout: 15_000,
  });
  await page.close();
});

test.describe("纵横四海 (Seaforge)：E2E 游戏流程", () => {
  test("首页自动加载、显示港口视图", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "泉州" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("第 1 天")).toBeVisible();
    await expect(page.getByText("5,000")).toBeVisible();
    await expect(page.getByText("舱容 0/30")).toBeVisible();
  });

  test("导航栏各链接冒烟测试", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "泉州" })).toBeVisible({
      timeout: 15_000,
    });

    // 交易所
    await page.locator("nav").getByRole("link", { name: "交易所" }).click();
    await expect(
      page.getByRole("button", { name: "买入" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // 船舱（空舱）
    await page.locator("nav").getByRole("link", { name: "船舱" }).click();
    await expect(page.getByText("空空如也")).toBeVisible({ timeout: 15_000 });

    // 航海图
    await page.locator("nav").getByRole("link", { name: "航海图" }).click();
    await expect(
      page.getByRole("button", { name: "前往" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // 造船厂（从港口卡片进入）
    await page.locator("nav").getByRole("link", { name: "港口" }).click();
    await page.getByRole("link", { name: /造船厂/ }).click();
    await expect(page.getByText("造船厂")).toBeVisible({ timeout: 15_000 });
  });

  test("完整流程：在交易所购买商品后船舱显示", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "泉州" })).toBeVisible({
      timeout: 15_000,
    });

    // 进入交易所
    await page.locator("nav").getByRole("link", { name: "交易所" }).click();
    await expect(
      page.getByRole("button", { name: /^买入$/ }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // 点击第一个可购买的"买入"按钮
    await page
      .getByRole("button", { name: /^买入$/ })
      .first()
      .click();

    // 购买弹窗出现 → 确认购买
    await expect(page.getByRole("button", { name: "确认购买" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "确认购买" }).click();
    // 进入船舱查看
    await page.locator("nav").getByRole("link", { name: "船舱" }).click();
    await expect(page.getByText("单桅帆船 - 船舱")).toBeVisible({
      timeout: 15_000,
    });

    // 应有货物（不再显示"空空如也"）
    await expect(page.getByText("空空如也")).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test("完整流程：出航并抵达", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "泉州" })).toBeVisible({
      timeout: 15_000,
    });

    // 进入航海图
    await page.locator("nav").getByRole("link", { name: "航海图" }).click();
    await expect(
      page.getByRole("button", { name: "前往" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // 点击第一个目的地的"前往"按钮
    await page.getByRole("button", { name: "前往" }).first().click();

    await expect(page.getByText("确认出航")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "确认出航" }).click();

    // 跳转到航行页
    await page.waitForURL("**/voyage", { timeout: 15_000 });

    // 显示"航行中"
    await expect(page.getByText("航行中")).toBeVisible({ timeout: 15_000 });

    // 点击"抵达"完成航行 → completeVoyage 会 redirect("/")
    await page.getByRole("button", { name: "抵达" }).click();

    // 等待重定向回港口页
    await page.waitForURL("/", { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    // 回到港口页，应显示港口名 heading（出发港泉州，到达港可能是长崎等）
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
